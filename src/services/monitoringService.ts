import fs from 'fs';
import * as jose from 'node-jose';
import axios, { AxiosResponse } from 'axios';
import nodemailer from 'nodemailer';
import FormData from 'form-data';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

const CLIENT_ID = '23b07e2e-e31d-4274-be67-13b38a09065c';
const KEYS_PATH = 'keys/keys.json';
const BULK_RESPONSE = 'static/bulkResponse.json';
const MOCK_RESPONSE = true;
const TOKEN_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';
const BULK_API_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Group/e3iabhmS8rsueyz7vaimuiaSmfGvi.QwjVXJANlPOgR83/$export?_type=Patient,Observation&_typeFilter=Observation%3Fcategory%3Dlaboratory';

interface TokenResponse {
  access_token: string;
}

interface BulkAPIResponse {
  output: { url: string; type: string }[];
}

interface Observation {
  resourceType: string;
  id: string;
  subject: { reference: string };
  code: { coding: { system: string; code: string; display: string }[] };
  valueQuantity?: { value: number; unit: string };
  interpretation?: Array<{ coding: Array<{ code: string }> }>;
  referenceRange?: Array<{ low?: { value: number }; high?: { value: number } }>;
}

interface Patient {
  resourceType: string;
  id: string;
  name: { given: string[]; family: string }[];
}

interface AbnormalResult {
  patientId: string;
  patientName: string;
  abnormalObservations: {
    id: string;
    code: string;
    display: string;
    value: number;
    unit: string;
    interpretation: string;
    referenceRange: string;
  }[];
}

class AbnormalLabReadingsService {
  private async getSignedJWT(): Promise<string> {
    try {
      const keyStore = await jose.JWK.asKeyStore(fs.readFileSync(KEYS_PATH).toString());
      const key = keyStore.get({ use: 'sig' });
      const currentTime = Math.floor(Date.now() / 1000);
      const payload = {
        iss: CLIENT_ID,
        sub: CLIENT_ID,
        aud: TOKEN_URL,
        exp: currentTime + 4 * 60,
        jti: randomUUID(),
        iat: currentTime,
        nbf: currentTime
      };

      return (await jose.JWS.createSign({ compact: true, fields: { 'type': 'jwt' } }, key)
        .update(JSON.stringify(payload))
        .final()).toString();
    } catch (error) {
      logger.error('Error generating signed JWT:', error);
      throw error;
    }
  }

  private async getAccessToken(signedJWT: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('grant_type', 'client_credentials');
      formData.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
      formData.append('client_assertion', signedJWT);

      const response: AxiosResponse<TokenResponse> = await axios.post(TOKEN_URL, formData, {
        headers: formData.getHeaders()
      });
      return response.data.access_token;
    } catch (error) {
      logger.error('Error getting access token:', error?.response?.data || error);
      throw error;
    }
  }

  private async makeBulkAPIRequest(accessToken: string): Promise<string> {
    try {
      const response: AxiosResponse<BulkAPIResponse> = await axios.get(BULK_API_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/fhir+json',
          'Prefer': 'respond-async'
        }
      });
      
      if (response.status !== 202) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

      const contentLocation = response.headers['content-location'];
      if (!contentLocation) {
        throw new Error('Content-Location header not found in response');
      }

      return contentLocation;
    } catch (error) {
      logger.error('Error making Bulk API request:', error?.response?.data || error);
      throw error;
    }
  }

  private async waitForBulkAPIResponse(statusUrl: string, accessToken: string): Promise<any> {
    if (MOCK_RESPONSE) {
      return JSON.parse(fs.readFileSync(BULK_RESPONSE, 'utf-8'));
    }

    const checkStatus = async (): Promise<any> => {
      try {
        const response: AxiosResponse = await axios.get(statusUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });
        if (response.status === 200) {
          return response?.data?.output;
        }
        logger.info(`Bulk API processing progress: ${response.headers['x-progress']}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return checkStatus();
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 202) {
          logger.info(`Bulk API processing progress: ${error.response.headers['x-progress']}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          return checkStatus();
        }
        logger.error('Error checking Bulk API status:', error);
        throw error;
      }
    };

    return checkStatus();
  }

  private async analyzePatientData(patientData: any[], observationData: any[]): Promise<AbnormalResult[]> {
    const abnormalResults: AbnormalResult[] = [];
    const patientMap = new Map<string, Patient>();

    patientData?.forEach((patient: Patient) => {
      if (patient.resourceType === 'Patient') {
        patientMap.set(patient.id, patient);
      }
    });

    observationData?.forEach((observation: Observation) => {
      if (observation.resourceType === 'Observation' && this.isAbnormalObservation(observation)) {
        const patientId = observation.subject.reference.split('/')[1];
        const patient = patientMap.get(patientId);

        if (patient) {
          let patientResult = abnormalResults.find(result => result.patientId === patientId);
          if (!patientResult) {
            patientResult = {
              patientId,
              patientName: `${patient.name[0].given.join(' ')} ${patient.name[0].family}`,
              abnormalObservations: []
            };
            abnormalResults.push(patientResult);
          }

          patientResult.abnormalObservations.push({
            id: observation.id,
            code: observation.code.coding[0].code,
            display: observation.code.text || observation.code.coding[0].display,
            value: this.getObservationValue(observation),
            unit: this.getObservationUnit(observation),
            interpretation: this.getInterpretation(observation),
            referenceRange: this.getReferenceRange(observation)
          });
        }
      }
    });

    return abnormalResults;
  }

  private isAbnormalObservation(observation: Observation): boolean {
    if (observation.interpretation) {
      const code = observation.interpretation[0].coding?.[0].code;
      return ['H', 'L', 'A', 'AA', 'HH', 'LL'].includes(code);
    }

    if (observation.valueQuantity && observation.referenceRange) {
      const value = observation.valueQuantity.value;
      const range = observation.referenceRange[0];
      if (range.low && value < range.low.value) return true;
      if (range.high && value > range.high.value) return true;
    }

    // Special case for cholesterol
    if (observation.code.coding.some(coding => coding.code === '2093-3') && 
        observation.valueQuantity && observation.valueQuantity.value > 180) {
      return true;
    }

    return false;
  }

  private getObservationValue(observation: Observation): string {
    if (observation.valueQuantity) {
      return observation.valueQuantity.value.toString();
    } else if (observation.valueString) {
      return observation.valueString;
    } else if (observation.valueCodeableConcept) {
      return observation.valueCodeableConcept.text || observation.valueCodeableConcept.coding[0].display;
    }
    return 'N/A';
  }

  private getObservationUnit(observation: Observation): string {
    return observation.valueQuantity?.unit || '';
  }

  private getInterpretation(observation: Observation): string {
    if (observation.interpretation) {
      const code = observation.interpretation[0].coding[0].code;
      switch (code) {
        case 'N': return 'Normal';
        case 'A': return 'Abnormal';
        case 'H': return 'High';
        case 'L': return 'Low';
        case 'HH': return 'Critical high';
        case 'LL': return 'Critical low';
        default: return code;
      }
    }
    return 'N/A';
  }

  private getReferenceRange(observation: Observation): string {
    if (observation.referenceRange) {
      const range = observation.referenceRange[0];
      const low = range.low?.value || '';
      const high = range.high?.value || '';
      return `${low} - ${high}`;
    }
    return 'N/A';
  }

  private async sendEmail(abnormalResults: AbnormalResult[]): Promise<void> {
    const transporter = nodemailer.createTransport({
      // host: process.env.SMTP_HOST,
      host: 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: 'loraine.kihn0@ethereal.email',
        pass: 'W8hurUmPu6GdZQev7Y'
      }
    });

    const mailText = abnormalResults.map(result => `
      Patient: ${result.patientName} (ID: ${result.patientId})
      Abnormal Observations:
      ${result.abnormalObservations.map(obs => `
        - ${obs.display} (${obs.code})
          Value: ${obs.value} ${obs.unit}
          Interpretation: ${obs.interpretation}
          Reference Range: ${obs.referenceRange}
      `).join('\n')}
      `).join('\n\n');

    const mailOptions = {
      from: "jitendra@nirmitee.io",
      to: "jitendra93266@gmail.com",
      subject: 'Abnormal Lab Readings Alert',
      text: `The following abnormal lab readings were detected:\n\n${mailText}`
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info('Email sent successfully');
    } catch (error) {
      logger.error('Error sending email:', error);
    }
  }

  private async processBulkData(bulkData: any, accessToken: string) {
    logger.info('Processing bulk data...');
    const patientData = bulkData?.output.filter((data: any) => data.type === 'Patient');
    const observationData = bulkData?.output.filter((data: any) => data.type === 'Observation');
    
    const fetchData = async (data: any) => {
      logger.info(`Processing data from: ${data.url}`);
      const response = await axios.get(data.url, {
        headers: {
          'Accept': 'application/fhir+json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
    
      // If the response data contains multiple JSON objects concatenated, 
      // we need to split them and parse individually.
      const jsonData = response.data;
    
      // Check if the data is in string format (i.e., concatenated JSON)
      if (typeof jsonData === 'string') {
        try {
          // Split by object boundary, e.g., between `}{`, then re-parse into an array of objects
          const jsonObjects = jsonData.split(/(?<=})\s*(?={)/g);
          const parsedObjects = jsonObjects.map(obj => JSON.parse(obj));
          return parsedObjects;
        } catch (error) {
          logger.error('Error parsing concatenated JSON:', error);
          throw error; // Re-throw the error if parsing fails
        }
      }
    
      // If it's already a valid array or object, return as is
      return jsonData;
    };
    
    
    const patientBundles = await Promise.all(patientData?.map(fetchData));
    const observationBundles = await Promise.all(observationData?.map(fetchData));
    
    return { patientBundles: patientBundles[0], observationBundles: observationBundles[0] };
  }

  public async monitorAbnormalLabReadings(): Promise<void | string> {
    try {
      logger.info('Starting abnormal lab readings monitoring process');
      const signedJWT = await this.getSignedJWT();
      logger.info('Signed JWT created');
      const accessToken = await this.getAccessToken(signedJWT);
      logger.info('Access token obtained');
    
      const bulkRequestUrl = "" //await this.makeBulkAPIRequest(accessToken);
      logger.info('Bulk API request initiated');
      const bulkData = await this.waitForBulkAPIResponse(bulkRequestUrl, accessToken);
      logger.info('Bulk API data received');
      const { patientBundles, observationBundles } = await this.processBulkData(bulkData, accessToken);
      logger.info('Bulk data processed');
      const abnormalResults = await this.analyzePatientData(patientBundles, observationBundles);
      logger.info(`Found abnormal lab readings for ${abnormalResults.length} patients`);
      
      if (abnormalResults.length > 0) {
        await this.sendEmail(abnormalResults);
      } else {
        logger.info('No abnormal lab readings found');
      }
      
      logger.info('Abnormal lab readings monitoring process completed');
      return JSON.stringify(abnormalResults);
    } catch (error) {
      logger.error('Error in monitorAbnormalLabReadings:', error);
      throw error;
    }
  }
}

export const monitoringService = new AbnormalLabReadingsService();