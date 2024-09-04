import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { LabResult } from './dataProcessingService';
import { logger } from '../utils/logger';

export class EmailService {
  private async loadTemplate(): Promise<string> {
    const templatePath = path.join(__dirname, 'emailTemplate.hbs');
    return await fs.readFileSync(templatePath, 'utf-8');
  }

  public async sendEmail(labResults: LabResult[]): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: 'loraine.kihn0@ethereal.email',
        pass: 'W8hurUmPu6GdZQev7Y'
      }
    });

    const abnormalResults = labResults.filter(result => result.isAbnormal);
    const normalResults = labResults.filter(result => !result.isAbnormal);
    
    
    const template = Handlebars.compile(await this.loadTemplate());

    const mailOptions = {
      from: "jitendra@nirmitee.io",
      to: "jitendra93266@gmail.com",
      subject: 'Abnormal Lab Readings Alert',
      html: template({ abnormalResults, normalResults })    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info('Email sent successfully');
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();