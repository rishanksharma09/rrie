export type FacilityLevel = 'Clinic' | 'District' | 'Tertiary';

export interface Facility {
    id: string;
    name: string;
    level: FacilityLevel;
    location: string;
    resources: {
        icuBeds: number;
        erBeds: number;
        specialistsAvailable: boolean;
        hasCT: boolean;
        hasCathLab: boolean;
        hasTraumaUnit: boolean;
    };
    status: 'Green' | 'Yellow' | 'Red';
    load: number; // 0-100%
}

export interface Ambulance {
    id: string;
    status: 'Available' | 'Busy';
    location: string;
    distanceFromPatient?: number; // Simulated
    eta?: number; // Simulated minutes
}

export interface SymptomData {
    description: string;
    urgency: 'Low' | 'Medium' | 'High';
    location: string;
}

export interface AIAnalysisResult {
    condition: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    confidence: number;
    reasoning: string;
}

export interface Referral {
    id: string;
    patientId: string;
    symptoms: SymptomData;
    analysis: AIAnalysisResult;
    recommendedPath: Facility[];
    assignedAmbulance?: Ambulance;
    timestamp: number;
    status: 'Pending' | 'In Transit' | 'Admitted';
}
