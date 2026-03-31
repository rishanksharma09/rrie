import React from 'react';
import { Settings, Activity, ShieldCheck, Zap } from 'lucide-react';
import { useMaintenanceStore } from '../../store/useMaintenanceStore';

export const MaintenanceOverlay: React.FC = () => {
    const { isMaintenance } = useMaintenanceStore();

    if (!isMaintenance) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-12 overflow-hidden select-none">
            {/* Background Blur Layer */}
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xl transition-all duration-1000 ease-in-out" />
            
            {/* Floating Orbs for Premium Background Feeling */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="relative max-w-2xl w-full glass-premium rounded-[3.5rem] p-10 md:p-16 border border-white/20 shadow-2xl text-center overflow-hidden group">
                {/* Decorative Inner Glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/5 blur-3xl rounded-full group-hover:bg-blue-400/10 transition-colors duration-700" />
                
                {/* Animated Central Icon Container */}
                <div className="relative mb-12">
                    <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-blue-400 mx-auto shadow-2xl shadow-blue-500/20 transform hover:scale-110 transition-all duration-500 group-hover:rotate-12">
                        <Settings size={44} className="animate-[spin_4s_linear_infinite]" />
                    </div>
                    {/* Pulsing Status Ring */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-blue-400/20 rounded-[2.5rem] animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                </div>

                {/* Content */}
                <div className="relative z-10 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-blue-100/50 text-blue-700 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-blue-200/50">
                                System Core
                            </span>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-100/50 text-teal-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-teal-200/50">
                                <Activity size={10} className="animate-pulse" />
                                Synchronizing
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">
                            Maintenance <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">In Progress</span>
                        </h1>
                    </div>

                    <p className="text-slate-500 font-medium text-lg max-w-md mx-auto leading-relaxed">
                        The Rural Referral Intelligence Engine is currently undergoing essential core state synchronization. We're optimizing the neural routing layer to serve you better.
                    </p>

                    <div className="pt-8 border-t border-slate-100/50 flex flex-col items-center gap-6">
                        <div className="flex items-center gap-8 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-teal-600" />
                                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Secured Layer</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap size={16} className="text-blue-600" />
                                <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Optimizing Bus</span>
                            </div>
                        </div>

                        {/* Estimated Time Placeholder - can be static or dynamic */}
                        <div className="w-full max-w-sm">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Syncing Nodes...</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-[shimmer_2s_infinite_linear]" style={{ width: '65%', backgroundSize: '200% 100%' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Background Branding */}
                <div className="absolute -bottom-6 -left-6 opacity-[0.03] select-none pointer-events-none">
                    <span className="text-8xl font-black italic tracking-tighter uppercase">RRIE</span>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    0% { background-position: 100% 0%; }
                    100% { background-position: -100% 0%; }
                }
                `
            }} />
        </div>
    );
};
