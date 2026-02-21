import { Link } from 'react-router-dom';
import { Shield, Activity, Truck, ChevronRight, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

const LandingPage = () => {
    const { language, setLanguage } = useLanguage();
    const t = translations[language];

    return (
        <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden font-sans">
            {/* Soft Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-[1000px] pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-teal-50/40 blur-[100px] rounded-full" />
            </div>

            {/* Language Toggle - Integrated & Minimal */}
            <div className="absolute top-6 right-6 z-50">
                <div className="glass-premium p-1 rounded-xl flex gap-1 border border-slate-200/50">
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => setLanguage('hi')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'hi' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        हिं
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
                {/* Hero Section - Production Grade Layout */}
                <div className="grid lg:grid-cols-12 gap-16 items-center mb-32">
                    <div className="lg:col-span-7 space-y-8">
                        <div>
                            <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-blue-100 mb-6">
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                                {t.badge}
                            </span>
                            <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
                                {t.heroTitle1} <br />
                                <span className="text-gradient-premium">{t.heroTitle2}</span>
                            </h1>
                            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl">
                                {t.heroSubtitle}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <Link
                                to="/user"
                                className="group relative bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-3 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-white/10 to-blue-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <Activity size={22} className="text-blue-400" />
                                {t.requestEmergency}
                                <ChevronRight size={18} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Stats Bento Box - Premium Visuals */}
                    <div className="lg:col-span-5 relative">
                        <div className="glass-premium rounded-[2.5rem] p-8 space-y-6 border border-white/60 relative z-10 animate-float">
                            <div className="flex items-center gap-5 p-4 bg-white/50 rounded-3xl border border-white/50">
                                <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-inner">
                                    <Activity size={28} />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-slate-900 uppercase tracking-widest">{t.systemActive}</div>
                                    <div className="text-xs text-slate-400 font-bold">{t.monitoringRealtime}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/50 p-6 rounded-3xl border border-white/50 group hover:bg-white transition-colors">
                                    <div className="text-3xl font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">12</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{t.hospitalsConnected}</div>
                                </div>
                                <div className="bg-white/50 p-6 rounded-3xl border border-white/50 group hover:bg-white transition-colors">
                                    <div className="text-3xl font-black text-slate-900 mb-1 group-hover:text-teal-600 transition-colors">08</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{t.ambulancesActive}</div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative Blur Elements */}
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/20 blur-3xl rounded-full" />
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/20 blur-3xl rounded-full" />
                    </div>
                </div>

                {/* Role Access - Premium Cards */}
                <div className="space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-black text-slate-900">{t.selectPortal}</h2>
                        <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* User Portal Card */}
                        <Link to="/user" className="group">
                            <div className="glass-card rounded-[2rem] p-10 h-full flex flex-col items-start text-left relative overflow-hidden">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
                                    <Shield size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{t.patientHealthWorker}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed mb-10 flex-grow">{t.patientDesc}</p>
                                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-widest group-hover:gap-4 transition-all">
                                    <span>{t.openUserPortal}</span>
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        </Link>

                        {/* Hospital Portal Card */}
                        <Link to="/hospital" className="group">
                            <div className="glass-card rounded-[2rem] p-10 h-full flex flex-col items-start text-left relative overflow-hidden">
                                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all duration-500 shadow-sm">
                                    <Activity size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{t.hospitalAdmin}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed mb-10 flex-grow">{t.hospitalDesc}</p>
                                <div className="flex items-center gap-2 text-teal-600 font-bold text-sm uppercase tracking-widest group-hover:gap-4 transition-all">
                                    <span>{t.openHospitalPortal}</span>
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        </Link>

                        {/* Ambulance Portal Card */}
                        <Link to="/ambulance" className="group">
                            <div className="glass-card rounded-[2rem] p-10 h-full flex flex-col items-start text-left relative overflow-hidden">
                                <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-sm">
                                    <Truck size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Ambulance Driver</h3>
                                <p className="text-slate-500 font-medium leading-relaxed mb-10 flex-grow">Receive patient assignments and navigate to emergency locations.</p>
                                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm uppercase tracking-widest group-hover:gap-4 transition-all">
                                    <span>Open Portal</span>
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
