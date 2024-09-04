import axios, { AxiosResponse } from 'axios';
import fs from 'fs';
import { logger } from '../utils/logger';

const BULK_API_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Group/e3iabhmS8rsueyz7vaimuiaSmfGvi.QwjVXJANlPOgR83/$export?_type=Patient,Observation&_typeFilter=Observation%3Fcategory%3Dlaboratory';
const BULK_RESPONSE = 'static/bulkResponse.json';
const MOCK_RESPONSE = false;

interface BulkAPIResponse {
  output: { url: string; type: string }[];
}

export class ApiService {
  public async makeBulkAPIRequest(accessToken: string): Promise<string> {
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

  public async waitForBulkAPIResponse(statusUrl: string, accessToken: string): Promise<any> {
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
          return response?.data;
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

  public async processBulkData(bulkData: any, accessToken: string) {
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
    
      const jsonData = response.data;
    
      if (typeof jsonData === 'string') {
        try {
          const jsonObjects = jsonData.split(/(?<=})\s*(?={)/g);
          const parsedObjects = jsonObjects.map(obj => JSON.parse(obj));
          return parsedObjects;
        } catch (error) {
          logger.error('Error parsing concatenated JSON:', error);
          throw error;
        }
      }
    
      return jsonData;
    };
    
    const patientBundles = await Promise.all(patientData?.map(fetchData));
    const observationBundles = await Promise.all(observationData?.map(fetchData));
    
    return { patientBundles: patientBundles[0], observationBundles: observationBundles[0] };
  }
}

export const apiService = new ApiService();