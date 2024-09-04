import { logger } from '../utils/logger';

interface Observation {
  resourceType: string;
  id: string;
  subject: { reference: string };
  code: { coding: { system: string; code: string; display: string }[]; text?: string };
  valueQuantity?: { value: number; unit: string };
  valueString?: string;
  valueCodeableConcept?: { text?: string; coding: { display: string }[] };
  interpretation?: Array<{ coding: Array<{ code: string; display: string }> }>;
  referenceRange?: Array<{ low?: { value: number }; high?: { value: number }; text?: string }>;
  effectiveDateTime?: string;
}

interface Patient {
  resourceType: string;
  id: string;
  name: { given: string[]; family: string }[];
  gender?: string;
  birthDate?: string;
}

export interface LabResult {
  patientId: string;
  patientName: string;
  patientGender?: string;
  patientAge?: number;
  observationId: string;
  observationCode: string;
  observationDisplay: string;
  value: number | string;
  unit: string;
  interpretation: string;
  referenceRange: string;
  effectiveDateTime?: string;
  isAbnormal: boolean;
  recommendation?: string;
}

export class DataProcessingService {
  public async analyzePatientData(patientData: any[], observationData: any[]): Promise<LabResult[]> {
    const labResults: LabResult[] = [];
    const patientMap = new Map<string, Patient>();

    patientData?.forEach((patient: Patient) => {
      if (patient.resourceType === 'Patient') {
        patientMap.set(patient.id, patient);
      }
    });

    observationData?.forEach((observation: Observation) => {
      if (observation.resourceType === 'Observation' && this.isLaboratoryObservation(observation)) {
        const patientId = observation.subject.reference.split('/')[1];
        const patient = patientMap.get(patientId);

        if (patient) {
          const isAbnormal = this.isAbnormalObservation(observation);
          const labResult: LabResult = {
            patientId,
            patientName: `${patient.name[0].given.join(' ')} ${patient.name[0].family}`,
            patientGender: patient.gender,
            patientAge: this.calculateAge(patient.birthDate),
            observationId: observation.id,
            observationCode: observation.code.coding[0].code,
            observationDisplay: observation.code.text || observation.code.coding[0].display,
            value: this.getObservationValue(observation),
            unit: this.getObservationUnit(observation),
            interpretation: this.getInterpretation(observation),
            referenceRange: this.getReferenceRange(observation),
            effectiveDateTime: observation.effectiveDateTime,
            isAbnormal,
            recommendation: isAbnormal ? this.getRecommendation(observation) : undefined
          };
          labResults.push(labResult);
        }
      }
    });

    return labResults;
  }

  private isLaboratoryObservation(observation: Observation): boolean {
    return observation.code.coding.some(coding => 
      coding.system === 'http://loinc.org' || 
      coding.system === 'http://snomed.info/sct'
    );
  }

  private isAbnormalObservation(observation: Observation): boolean {
    // Check interpretation first
    if (observation.interpretation && observation.interpretation.length > 0) {
      const code = observation.interpretation[0].coding[0].code;
      return ['H', 'L', 'A', 'AA', 'HH', 'LL'].includes(code);
    }

    // If no interpretation, check against reference range
    if (observation.valueQuantity && observation.referenceRange && observation.referenceRange.length > 0) {
      const value = observation.valueQuantity.value;
      const range = observation.referenceRange[0];
      
      if (range.low && range.high) {
        return value < range.low.value || value > range.high.value;
      } else if (range.low) {
        return value < range.low.value;
      } else if (range.high) {
        return value > range.high.value;
      }
    }

    // If no quantitative value or reference range, check for abnormal string values
    if (observation.valueString) {
      const abnormalTerms = ['abnormal', 'positive', 'reactive', 'elevated', 'decreased'];
      return abnormalTerms.some(term => observation.valueString!.toLowerCase().includes(term));
    }

    // If none of the above conditions are met, consider it normal
    return false;
  }

  private getObservationValue(observation: Observation): number | string {
    if (observation.valueQuantity) {
      return observation.valueQuantity.value;
    } else if (observation.valueString) {
      return observation.valueString;
    } else if (observation.valueCodeableConcept) {
      return observation.valueCodeableConcept.text || observation.valueCodeableConcept.coding[0].display;
    }
    return 'N/A';
  }

  private getObservationUnit(observation: Observation): string {
    return observation.valueQuantity?.unit || '';
  }

  private getInterpretation(observation: Observation): string {
    if (observation.interpretation && observation.interpretation.length > 0) {
      return observation.interpretation[0].coding[0].display || observation.interpretation[0].coding[0].code;
    }
    return 'N/A';
  }

  private getReferenceRange(observation: Observation): string {
    if (observation.referenceRange && observation.referenceRange.length > 0) {
      const range = observation.referenceRange[0];
      if (range.text) {
        return range.text;
      }
      const low = range.low?.value !== undefined ? range.low.value : '';
      const high = range.high?.value !== undefined ? range.high.value : '';
      return `${low} - ${high}`;
    }
    return 'N/A';
  }

  private calculateAge(birthDate?: string): number | undefined {
    if (!birthDate) return undefined;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private getRecommendation(observation: Observation): string {
    const value = this.getObservationValue(observation);
    const interpretation = this.getInterpretation(observation);
    const observationDisplay = observation.code.text || observation.code.coding[0].display;
    
    if (typeof value === 'number') {
      if (interpretation.includes('High') || interpretation.includes('H')) {
        return `${observationDisplay} is high. Consider lifestyle changes and consult with your healthcare provider.`;
      } else if (interpretation.includes('Low') || interpretation.includes('L')) {
        return `${observationDisplay} is low. Consider dietary changes and consult with your healthcare provider.`;
      }
    }
    
    return `Abnormal ${observationDisplay} result detected. Please consult with your healthcare provider for proper interpretation and advice.`;
  }
}

export const dataProcessingService = new DataProcessingService();