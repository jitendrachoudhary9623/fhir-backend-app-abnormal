import { logger } from '../utils/logger';
import { authService } from './authService';
import { apiService } from './apiService';
import { dataProcessingService } from './dataProcessingService';
import { emailService } from './emailService';

export class AbnormalLabReadingsService {
  public async monitorAbnormalLabReadings(): Promise<void | string> {
    try {
      logger.info('Starting abnormal lab readings monitoring process');
      const signedJWT = await authService.getSignedJWT();
      logger.info('Signed JWT created');
      const accessToken = await authService.getAccessToken(signedJWT);
      logger.info('Access token obtained');
    
      const bulkRequestUrl = await apiService.makeBulkAPIRequest(accessToken);
      logger.info('Bulk API request initiated');
      const bulkData = await apiService.waitForBulkAPIResponse(bulkRequestUrl, accessToken);
      logger.info('Bulk API data received');
      const { patientBundles, observationBundles } = await apiService.processBulkData(bulkData, accessToken);
      logger.info('Bulk data processed');
      const abnormalResults = await dataProcessingService.analyzePatientData(patientBundles, observationBundles);
      logger.info(`Found abnormal lab readings for ${abnormalResults.length} patients`);
      
      if (abnormalResults.length > 0) {
        await emailService.sendEmail(abnormalResults);
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