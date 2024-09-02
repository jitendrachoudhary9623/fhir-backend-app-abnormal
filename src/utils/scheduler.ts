import schedule from 'node-schedule';
import { PatientService } from '../services/patientService';
import { logger } from './logger';

const patientService = new PatientService();

export const startScheduler = () => {
  // Schedule a job to run every day at midnight
  schedule.scheduleJob('0 0 * * *', async () => {
    try {
      logger.info('Starting daily patient data sync');
      const patients = await patientService.getPatients();
      // Perform any necessary operations with the patient data
      logger.info(`Synced ${patients.length} patients`);
    } catch (error) {
      logger.error('Error in daily patient data sync:', error);
    }
  });
};