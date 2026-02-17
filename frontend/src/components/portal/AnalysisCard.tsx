import React from 'react';
import { AlertCircle, BrainCircuit, CheckCircle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';
import type { AIAnalysisResult } from '../../types';
import { motion } from 'framer-motion';

interface AnalysisCardProps {
    result: AIAnalysisResult;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ result }) => {
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'Critical': return 'text-red-700 bg-red-50 border-red-200';
            case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
            case 'Medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
            default: return 'text-green-700 bg-green-50 border-green-200';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden"
        >
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <BrainCircuit className="h-6 w-6" />
                    <h3 className="font-semibold text-lg">AI Diagnostic Insight</h3>
                </div>
                <div className="bg-blue-500/30 px-3 py-1 rounded-full text-blue-50 text-xs font-medium border border-blue-400/30">
                    Confidence: {(result.confidence * 100).toFixed(0)}%
                </div>
            </div>

            <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Potential Condition</p>
                        <h4 className="text-2xl font-bold text-gray-900">{result.condition}</h4>
                    </div>
                    <div className={clsx("px-4 py-2 rounded-lg border font-semibold flex items-center gap-2", getSeverityColor(result.severity))}>
                        {result.severity === 'Critical' ? <ShieldAlert className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        {result.severity.toUpperCase()}
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Clinical Reasoning:</p>
                    <p className="text-gray-600 leading-relaxed">
                        {result.reasoning}
                    </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Analysis completed in 1.2s</span>
                </div>
            </div>
        </motion.div>
    );
};
