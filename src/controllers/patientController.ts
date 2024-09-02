import { Request, Response, NextFunction } from 'express';
import { PatientService } from '../services/patientService';

const patientService = new PatientService();

export const getPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patients = await patientService.getPatients();
    res.json(patients);
  } catch (error) {
    next(error);
  }
};

export const getPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await patientService.getPatient(req.params.id);
    if (patient) {
      res.json(patient);
    } else {
      res.status(404).json({ message: 'Patient not found' });
    }
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await patientService.createPatient(req.body);
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await patientService.updatePatient(req.params.id, req.body);
    if (patient) {
      res.json(patient);
    } else {
      res.status(404).json({ message: 'Patient not found' });
    }
  } catch (error) {
    next(error);
  }
};

export const deletePatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await patientService.deletePatient(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Patient not found' });
    }
  } catch (error) {
    next(error);
  }
};