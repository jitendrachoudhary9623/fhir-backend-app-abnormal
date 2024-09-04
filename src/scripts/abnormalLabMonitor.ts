import fs from 'fs';
import * as jose from 'node-jose';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const CLIENT_ID = '23b07e2e-e31d-4274-be67-13b38a09065c';
const KEYS_PATH = 'keys/keys.json';
const TOKEN_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';
const BULK_API_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Patient/$export';

async function getSignedJWT(): Promise<string> {
  try {
    const privateKey = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf8')).private_key;
    const key = await jose.JWK.asKey(privateKey, 'pem');
    
    const payload = {
      iss: CLIENT_ID,
      sub: CLIENT_ID,
      aud: TOKEN_URL,
      exp: Math.floor(Date.now() / 1000) + 4 * 60, // 4 minutes from now
      jti: Math.random().toString(36).substring(2)
    };

    const token = await jose.JWS.createSign({ format: 'compact', fields: { typ: 'JWT' } }, key)
      .update(JSON.stringify(payload))
      .final();

    return token.toString();
  } catch (error) {
    logger.error('Error generating signed JWT:', error);
    throw error;
  }
}

async function getAccessToken(signedJWT: string): Promise<string> {
  try {
    const response = await axios.post(TOKEN_URL, {
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: signedJWT
    });
    return response.data.access_token;
  } catch (error) {
    logger.error('Error getting access token:', error);
    throw error;
  }
}

async function makeBulkAPIRequest(accessToken: string): Promise<string> {
  try {
    const response = await axios.get(BULK_API_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });
    return response.data.output[0].url;
  } catch (error) {
    logger.error('Error making Bulk API request:', error);
    throw error;
  }
}

async function waitForBulkAPIResponse(statusUrl: string, accessToken: string): Promise<any> {
  while (true) {
    try {
      const response = await axios.get(statusUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      if (error.response && error.response.status === 202) {
        logger.info('Bulk API still processing, waiting...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        logger.error('Error checking Bulk API status:', error);
        throw error;
      }
    }
  }
}

function checkAbnormalLabReadings(data: any): any[] {
  const abnormalReadings = [];
  data.entry.forEach(entry => {
    if (entry.resource.resourceType === 'Observation' && entry.resource.interpretation) {
      const interpretation = entry.resource.interpretation[0].coding[0].code;
      if (interpretation === 'A' || interpretation === 'AA' || interpretation === 'HH' || interpretation === 'LL') {
        abnormalReadings.push(entry.resource);
      }
    }
  });
  return abnormalReadings;
}

async function sendEmail(abnormalReadings: any[]): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: 'Abnormal Lab Readings Alert',
    text: `The following abnormal lab readings were detected:\n\n${JSON.stringify(abnormalReadings, null, 2)}`
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully');
  } catch (error) {
    logger.error('Error sending email:', error);
  }
}

export async function monitorAbnormalLabReadings(): Promise<void> {
  try {
    logger.info('Starting abnormal lab readings monitoring process');
    const signedJWT = await getSignedJWT();
    logger.info('Signed JWT created');
    const accessToken = await getAccessToken(signedJWT);
    logger.info('Access token obtained');
    const bulkRequestUrl = await makeBulkAPIRequest(accessToken);
    logger.info('Bulk API request initiated');
    const bulkData = await waitForBulkAPIResponse(bulkRequestUrl, accessToken);
    logger.info('Bulk API data received');
    const abnormalReadings = checkAbnormalLabReadings(bulkData);
    logger.info(`Found ${abnormalReadings.length} abnormal lab readings`);
    
    if (abnormalReadings.length > 0) {
      await sendEmail(abnormalReadings);
    } else {
      logger.info('No abnormal lab readings found');
    }
    logger.info('Abnormal lab readings monitoring process completed');
  } catch (error) {
    logger.error('Error in monitorAbnormalLabReadings:', error);
  }
}