import cron from 'node-cron';
import {monitoringService} from '../services/monitoringService';
import { logger } from '../utils/logger';

cron.schedule('0 0 * * *', async () => {
  logger.info('Running daily abnormal lab monitoring job');
  try {
    await monitoringService.monitorAbnormalLabReadings();
    logger.info('Abnormal lab monitoring job completed successfully');
  } catch (error) {
    logger.error('Error in abnormal lab monitoring job:', error);
  }
});

export const startCronJob = () => {
  logger.info('Cron job scheduled to run daily at midnight');
};