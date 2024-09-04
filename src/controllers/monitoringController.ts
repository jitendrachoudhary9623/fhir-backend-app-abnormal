import { Request, Response } from 'express';
import { monitoringService } from '../services/monitoringService';
import { logger } from '../utils/logger';

class AbnormalLabReadingsController {
  /**
   * Initiates the monitoring process for abnormal lab readings.
   * @param req - The Express request object
   * @param res - The Express response object
   */
  public async monitorReadings(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Abnormal lab readings monitoring initiated');
      const response = await monitoringService.monitorAbnormalLabReadings();
      res.status(200).json({response, message: 'Abnormal lab readings monitoring completed successfully' });
    } catch (error) {
      logger.error('Error in monitorReadings controller:', error);
      res.status(500).json({ error: 'An error occurred while monitoring abnormal lab readings' });
    }
  }

  /**
   * Retrieves the latest monitoring results.
   * This is a placeholder method and should be implemented based on how you store/retrieve results.
   * @param req - The Express request object
   * @param res - The Express response object
   */
  public async getLatestResults(req: Request, res: Response): Promise<void> {
    try {
      // This is a placeholder. You would typically retrieve this from a database or cache.
      const latestResults = { message: 'No abnormal readings found in the last scan' };
      res.status(200).json(latestResults);
    } catch (error) {
      logger.error('Error in getLatestResults controller:', error);
      res.status(500).json({ error: 'An error occurred while retrieving the latest results' });
    }
  }

  /**
   * Allows manual triggering of the email alert.
   * This could be useful for testing or sending alerts outside the regular monitoring schedule.
   * @param req - The Express request object
   * @param res - The Express response object
   */
  public async sendManualAlert(req: Request, res: Response): Promise<void> {
    try {
      // This is a placeholder. You would typically retrieve abnormal readings and then send the email.
      const abnormalReadings = [{ id: '123', value: 'High', type: 'Glucose' }];
      await monitoringService['sendEmail'](abnormalReadings);
      res.status(200).json({ message: 'Manual alert sent successfully' });
    } catch (error) {
      logger.error('Error in sendManualAlert controller:', error);
      res.status(500).json({ error: 'An error occurred while sending the manual alert' });
    }
  }
}

export const abnormalLabReadingsController = new AbnormalLabReadingsController();