import express from 'express';
import { abnormalLabReadingsController } from '../controllers/monitoringController';

const router = express.Router();

/**
 * @swagger
 * /api/abnormal-lab-readings/monitor:
 *   post:
 *     summary: Initiate monitoring of abnormal lab readings
 *     tags: [Abnormal Lab Readings]
 *     responses:
 *       200:
 *         description: Monitoring process completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: An error occurred while monitoring
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/monitor', abnormalLabReadingsController.monitorReadings);

/**
 * @swagger
 * /api/abnormal-lab-readings/results:
 *   get:
 *     summary: Get the latest abnormal lab reading results
 *     tags: [Abnormal Lab Readings]
 *     responses:
 *       200:
 *         description: Latest monitoring results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonitoringResult'
 *       500:
 *         description: An error occurred while retrieving results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/results', abnormalLabReadingsController.getLatestResults);

/**
 * @swagger
 * /api/abnormal-lab-readings/alert:
 *   post:
 *     summary: Manually trigger an alert for abnormal lab readings
 *     tags: [Abnormal Lab Readings]
 *     responses:
 *       200:
 *         description: Manual alert sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: An error occurred while sending the alert
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/alert', abnormalLabReadingsController.sendManualAlert);

/**
 * @swagger
 * components:
 *   schemas:
 *     MonitoringResult:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         abnormalReadings:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AbnormalReading'
 *     AbnormalReading:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         resourceType:
 *           type: string
 *           enum: [Observation]
 *         status:
 *           type: string
 *         code:
 *           type: object
 *           properties:
 *             coding:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   system:
 *                     type: string
 *                   code:
 *                     type: string
 *                   display:
 *                     type: string
 *         subject:
 *           type: object
 *           properties:
 *             reference:
 *               type: string
 *         effectiveDateTime:
 *           type: string
 *           format: date-time
 *         valueQuantity:
 *           type: object
 *           properties:
 *             value:
 *               type: number
 *             unit:
 *               type: string
 *             system:
 *               type: string
 *             code:
 *               type: string
 *         interpretation:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               coding:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     system:
 *                       type: string
 *                     code:
 *                       type: string
 *                     display:
 *                       type: string
 */

export default router;