import express from 'express';
import patientRoutes from './patientRoutes';

export const apiRouter = express.Router();

apiRouter.use('/patients', patientRoutes);