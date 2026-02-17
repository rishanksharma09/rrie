import React, { createContext, useContext, useState } from 'react';
import type { Facility, Ambulance, Referral, SymptomData, AIAnalysisResult } from '../types';

interface SimulationContextType {
    facilities: Facility[];
    ambulances: Ambulance[];
    referrals: Referral[];
    isAnalyzing: boolean;
    updateFacility: (id: string, updates: Partial<Facility['resources']>) => void;
    analyzeSymptoms: (symptoms: SymptomData) => Promise<Referral | null>;
    triggerSurge: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const INITIAL_FACILITIES: Facility[] = [
    {
        id: 'f1',
        name: 'Rural Health Center A',
        level: 'Clinic',
        location: 'Village A',
        resources: { icuBeds: 0, erBeds: 2, specialistsAvailable: false, hasCT: false, hasCathLab: false, hasTraumaUnit: false },
        status: 'Green',
        load: 10
    },
    {
        id: 'f2',
        name: 'District Hospital B',
        level: 'District',
        location: 'Town B',
        resources: { icuBeds: 5, erBeds: 10, specialistsAvailable: true, hasCT: true, hasCathLab: false, hasTraumaUnit: true },
        status: 'Green',
        load: 40
    },
    {
        id: 'f3',
        name: 'City Specialty Center',
        level: 'Tertiary',
        location: 'City C',
        resources: { icuBeds: 20, erBeds: 30, specialistsAvailable: true, hasCT: true, hasCathLab: true, hasTraumaUnit: true },
        status: 'Green',
        load: 60
    },
    {
        id: 'f4',
        name: 'Community Clinic D',
        level: 'Clinic',
        location: 'Village D',
        resources: { icuBeds: 0, erBeds: 3, specialistsAvailable: false, hasCT: false, hasCathLab: false, hasTraumaUnit: false },
        status: 'Green',
        load: 15
    },
    {
        id: 'f5',
        name: 'General Hospital E',
        level: 'District',
        location: 'Town E',
        resources: { icuBeds: 8, erBeds: 15, specialistsAvailable: true, hasCT: true, hasCathLab: false, hasTraumaUnit: true },
        status: 'Yellow',
        load: 75
    }
];

const INITIAL_AMBULANCES: Ambulance[] = [
    { id: 'AMB-01', status: 'Available', location: 'Station A', eta: 10 },
    { id: 'AMB-02', status: 'Available', location: 'Station B', eta: 25 },
    { id: 'AMB-03', status: 'Busy', location: 'En Route', eta: 0 },
    { id: 'AMB-04', status: 'Available', location: 'Station C', eta: 15 },
    { id: 'AMB-05', status: 'Available', location: 'Station D', eta: 8 },
];

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);
    const [ambulances] = useState<Ambulance[]>(INITIAL_AMBULANCES);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Helper to determine status based on load/resources
    const calculateFacilityStatus = (facility: Facility) => {
        // Simple logic: if load > 90 -> Red, > 70 -> Yellow, else Green
        if (facility.load > 90) return 'Red';
        if (facility.load > 70) return 'Yellow';
        return 'Green';
    };

    const updateFacility = (id: string, updates: Partial<Facility['resources']>) => {
        setFacilities(prev => prev.map(f => f.id === id ? { ...f, resources: { ...f.resources, ...updates } } : f));
    };

    const analyzeSymptoms = async (symptoms: SymptomData): Promise<Referral | null> => {
        setIsAnalyzing(true);

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock AI Logic
        const analysis: AIAnalysisResult = {
            condition: symptoms.description.toLowerCase().includes('chest') ? 'Myocardial Infarction' : 'Acute Stroke',
            severity: 'Critical',
            confidence: 0.94,
            reasoning: symptoms.description.toLowerCase().includes('chest')
                ? "Keywords 'chest pain' and 'radiating' suggest cardiac event."
                : "Symptoms indicate neurological deficit consistent with stroke."
        };

        // Mock Path selection logic
        const recommendedPath = [facilities[0], facilities[1], facilities[2]]; // Simple path for now

        const newReferral: Referral = {
            id: Math.random().toString(36).substr(2, 9),
            patientId: 'P-' + Math.floor(Math.random() * 1000),
            symptoms,
            analysis,
            recommendedPath,
            assignedAmbulance: ambulances.find(a => a.status === 'Available'),
            timestamp: Date.now(),
            status: 'Pending'
        };

        setReferrals(prev => [newReferral, ...prev]);
        setIsAnalyzing(false);
        return newReferral;
    };

    const triggerSurge = () => {
        // Simulate 5 simultaneous referrals
        const surgeReferrals: Referral[] = Array(5).fill(null).map((_, i) => ({
            id: `surge-${i}`,
            patientId: `P-SURGE-${i}`,
            symptoms: { description: 'Trauma / Accident', urgency: 'High', location: 'Highway' },
            analysis: { condition: 'Multiple Trauma', severity: 'High', confidence: 0.88, reasoning: 'High velocity impact reported.' },
            recommendedPath: [facilities[i % facilities.length]], // Distribute
            timestamp: Date.now(),
            status: 'Pending'
        }));

        setReferrals(prev => [...surgeReferrals, ...prev]);

        // Increase load on facilities
        setFacilities(prev => prev.map(f => ({
            ...f,
            load: Math.min(100, f.load + 20),
            status: calculateFacilityStatus({ ...f, load: Math.min(100, f.load + 20) })
        })));
    };

    return (
        <SimulationContext.Provider value={{ facilities, ambulances, referrals, isAnalyzing, updateFacility, analyzeSymptoms, triggerSurge }}>
            {children}
        </SimulationContext.Provider>
    );
};

export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (context === undefined) {
        throw new Error('useSimulation must be used within a SimulationProvider');
    }
    return context;
};
