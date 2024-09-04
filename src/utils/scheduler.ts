import schedule from 'node-schedule';
import { PatientService } from '../services/patientService';
import { logger } from './logger';
import { startCronJob } from '../scripts/cronJob';

const patientService = new PatientService();

export const startScheduler = () => {
  // Start the cron job for abnormal lab monitoring
  startCronJob();
};