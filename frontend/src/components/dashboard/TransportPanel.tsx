import React from 'react';
import type { Ambulance } from '../../types';
import { Truck, MapPin, Navigation } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface TransportPanelProps {
    ambulances: Ambulance[];
}

export const TransportPanel: React.FC<TransportPanelProps> = ({ ambulances }) => {
    return (
        <div className="space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Truck className="h-5 w-5" />
                </div>
                Transport Availability
            </h3>
            <div className="space-y-3">
                {ambulances.map((ambulance, index) => (
                    <motion.div
                        key={ambulance.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={clsx(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                            ambulance.status === 'Available'
                                ? "bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200"
                                : "bg-slate-50 border-transparent opacity-60 grayscale-[0.5]"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                "p-3 rounded-xl shadow-sm",
                                ambulance.status === 'Available' ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                            )}>
                                <Truck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">{ambulance.id}</p>
                                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                                    <MapPin className="h-3 w-3" />
                                    {ambulance.location}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-1",
                                ambulance.status === 'Available' ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-slate-600 bg-slate-100 border border-slate-200"
                            )}>
                                {ambulance.status}
                            </div>
                            {ambulance.status === 'Available' && (
                                <p className="text-xs text-emerald-600 font-bold font-mono flex items-center justify-end gap-1">
                                    <Navigation className="h-3 w-3" />
                                    {ambulance.eta} min
                                </p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

