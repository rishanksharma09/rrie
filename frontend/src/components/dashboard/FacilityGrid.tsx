import React from 'react';
import type { Facility } from '../../types';
import { Building, Activity, User, Bed } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface FacilityGridProps {
    facilities: Facility[];
}

export const FacilityGrid: React.FC<FacilityGridProps> = ({ facilities }) => {
    return (
        <div className="space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <Building className="h-5 w-5" />
                </div>
                Live Facility Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-5">
                {facilities.map((facility, index) => (
                    <motion.div
                        key={facility.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={clsx(
                            "rounded-2xl p-5 border transition-all duration-300 shadow-card hover:shadow-card-hover group relative overflow-hidden",
                            facility.status === 'Green' ? "bg-white border-slate-100" :
                                facility.status === 'Yellow' ? "bg-amber-50/30 border-amber-100" :
                                    "bg-red-50/30 border-red-100"
                        )}
                    >
                        {/* Status Indicator Bar */}
                        <div className={clsx(
                            "absolute top-0 left-0 w-1.5 h-full",
                            facility.status === 'Green' ? "bg-emerald-500" :
                                facility.status === 'Yellow' ? "bg-amber-500" : "bg-red-500"
                        )} />

                        <div className="flex justify-between items-start mb-4 pl-3">
                            <div>
                                <h4 className="font-bold text-slate-900 text-base leading-tight group-hover:text-blue-700 transition-colors">{facility.name}</h4>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                    <MapPinIcon className="h-3 w-3" /> {facility.location}
                                </p>
                            </div>
                            <span className={clsx(
                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm",
                                facility.level === 'Tertiary' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                    facility.level === 'District' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                        "bg-slate-50 text-slate-700 border-slate-100"
                            )}>
                                {facility.level}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs pl-3">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2 text-slate-600">
                                <Bed className="h-3.5 w-3.5 text-blue-500" />
                                <span>ICU: <b className="text-slate-900">{facility.resources.icuBeds}</b></span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2 text-slate-600">
                                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                                <span>ER: <b className="text-slate-900">{facility.resources.erBeds}</b></span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2 text-slate-600 col-span-2">
                                <User className={clsx("h-3.5 w-3.5", facility.resources.specialistsAvailable ? "text-emerald-500" : "text-slate-400")} />
                                <span className={facility.resources.specialistsAvailable ? "text-emerald-700 font-bold" : "text-slate-400"}>
                                    {facility.resources.specialistsAvailable ? "Specialists Active" : "No Specialists"}
                                </span>
                            </div>
                            <div className="flex gap-1.5 col-span-2 mt-1">
                                {facility.resources.hasCT && <Badge text="CT" color="blue" />}
                                {facility.resources.hasCathLab && <Badge text="Cath" color="purple" />}
                                {facility.resources.hasTraumaUnit && <Badge text="Trauma" color="red" />}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center pl-3">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Load</span>
                            <div className="flex items-center gap-2 w-1/2">
                                <span className="text-xs font-bold text-slate-700 w-6 text-right">{facility.load}%</span>
                                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${facility.load}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={clsx("h-full rounded-full shadow-sm",
                                            facility.load > 90 ? "bg-red-500" :
                                                facility.load > 70 ? "bg-amber-500" : "bg-emerald-500"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const Badge = ({ text, color }: { text: string, color: string }) => {
    const colors: Record<string, string> = {
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        purple: "bg-purple-50 text-purple-700 border-purple-100",
        red: "bg-red-50 text-red-700 border-red-100",
    };
    return (
        <span className={clsx("px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border", colors[color])}>
            {text}
        </span>
    );
}

function MapPinIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    )
}

