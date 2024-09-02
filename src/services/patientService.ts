import { Patient } from '../models/patient';
import fhir from 'fhir.js';

export class PatientService {
  private client: any;

  constructor() {
    this.client = fhir({
      baseUrl: process.env.FHIR_SERVER_URL,
    });
  }

  async getPatients(): Promise<Patient[]> {
    const response = await this.client.search({ type: 'Patient' });
    return response.data.entry.map((entry: any) => entry.resource);
  }

  async getPatient(id: string): Promise<Patient | null> {
    try {
      const response = await this.client.read({ type: 'Patient', id });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createPatient(patientData: any): Promise<Patient> {
    const response = await this.client.create({ type: 'Patient', resource: patientData });
    return response.data;
  }

  async updatePatient(id: string, patientData: any): Promise<Patient | null> {
    try {
      const response = await this.client.update({ type: 'Patient', id, resource: patientData });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      await this.client.delete({ type: 'Patient', id });
      return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false;
      }
      throw error;
    }
  }
}