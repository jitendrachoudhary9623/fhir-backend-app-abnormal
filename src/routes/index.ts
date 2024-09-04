import express from 'express';
import patientRoutes from './patientRoutes';
import monitoringRoutes from './monitoringRoutes';
export const apiRouter = express.Router();

apiRouter.use('/patients', patientRoutes);
apiRouter.use('/abnormal-lab-readings', monitoringRoutes)