import React from 'react';
import type { Referral } from '../../types';
import { ArrowRight, Clock, Truck, ShieldCheck, Activity } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface ReferralCardProps {
    referral: Referral;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({ referral }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden relative"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Activity className="h-64 w-64 text-blue-900" />
            </div>

            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-8 py-6 flex justify-between items-center text-white relative z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <ShieldCheck className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl tracking-tight">Recommendation Engine</h3>
                        <p className="text-blue-100 text-sm font-medium opacity-90">AI Analysis ID: <span className="font-mono opacity-100 bg-white/10 px-1.5 py-0.5 rounded">{referral.patientId}</span></p>
                    </div>
                </div>
                <div className="flex flex-col items-end text-right">
                    <span className="text-3xl font-bold tracking-tighter">52 <span className="text-lg font-medium text-blue-200">min</span></span>
                    <span className="text-[10px] uppercase tracking-widest text-blue-200 font-bold bg-blue-800/30 px-2 py-0.5 rounded-full backdrop-blur-sm border border-blue-400/30">Est. Arrival</span>
                </div>
            </div>

            <div className="p-8 relative z-10">
                <div className="mb-8 p-6 bg-slate-50/80 rounded-2xl border border-slate-100">
                    <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="h-px flex-1 bg-slate-200"></span>
                        Optimized Care Pathway
                        <span className="h-px flex-1 bg-slate-200"></span>
                    </h4>

                    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                        {referral.recommendedPath.map((facility, index) => (
                            <React.Fragment key={facility.id}>
                                <div className={clsx(
                                    "flex-shrink-0 px-6 py-4 rounded-xl border-2 flex flex-col items-center justify-center min-w-[140px] text-center transition-all",
                                    index === referral.recommendedPath.length - 1
                                        ? "border-emerald-500 bg-emerald-50 shadow-sm ring-4 ring-emerald-500/10"
                                        : "border-slate-200 bg-white text-slate-400"
                                )}>
                                    <span className={clsx("text-[10px] font-bold uppercase tracking-wider mb-2",
                                        index === referral.recommendedPath.length - 1 ? "text-emerald-600" : "text-slate-400"
                                    )}>{facility.level}</span>
                                    <span className={clsx("text-sm font-bold leading-tight",
                                        index === referral.recommendedPath.length - 1 ? "text-emerald-900" : "text-slate-500"
                                    )}>{facility.name.split(' ').slice(0, 2).join(' ')}</span>
                                </div>
                                {index < referral.recommendedPath.length - 1 && (
                                    <ArrowRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-blue-50/50 p-5 rounded-2xl flex items-center gap-4 border border-blue-100 transition-colors hover:bg-blue-50">
                        <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shadow-sm">
                            <Truck className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Transport Mode</p>
                            <p className="text-blue-900 font-bold text-lg">Ambulance (ALS)</p>
                        </div>
                    </div>

                    <div className="bg-amber-50/50 p-5 rounded-2xl flex items-center gap-4 border border-amber-100 transition-colors hover:bg-amber-50">
                        <div className="bg-amber-100 p-3 rounded-xl text-amber-600 shadow-sm">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Urgency Level</p>
                            <p className="text-amber-900 font-bold text-lg">{referral.analysis.severity}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <h4 className="flex items-center gap-2 text-slate-800 font-bold mb-4 text-sm uppercase tracking-wide">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        AI Reasoning & Explainability
                    </h4>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-4 text-sm text-slate-600">
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 shadow-[0_0_10px_rgb(59,130,246)]" />
                            <span className="leading-relaxed">Patient condition <span className="font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded text-xs">{referral.analysis.condition}</span> requires immediate specific intervention.</span>
                        </li>
                        <li className="flex items-start gap-4 text-sm text-slate-600">
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 shadow-[0_0_10px_rgb(59,130,246)]" />
                            <span className="leading-relaxed">District Hospital bypassed due to <b className="text-red-500">ICU Saturation (98%)</b>.</span>
                        </li>
                        <li className="flex items-start gap-4 text-sm text-slate-600">
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0 shadow-[0_0_10px_rgb(16,185,129)]" />
                            <span className="leading-relaxed">Tertiary center has available <b className="text-emerald-600">Cath Lab</b> and <b className="text-emerald-600">Neuro specialists</b>.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </motion.div>
    );
};

