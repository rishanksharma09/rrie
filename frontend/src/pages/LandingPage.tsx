import { Link } from 'react-router-dom';
import { Shield, Activity, Truck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

const LandingPage = () => {
    const { language, setLanguage } = useLanguage();
    const t = translations[language];

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent -z-10" />

            {/* Language Toggle */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${language === 'en' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >
                    EN
                </button>
                <button
                    onClick={() => setLanguage('hi')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${language === 'hi' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >
                    हिं
                </button>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
                {/* Hero Section */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
                    <div>
                        <div className="mb-6">
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                                {t.badge}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
                            {t.heroTitle1} <br />
                            <span className="text-blue-800">{t.heroTitle2}</span>
                        </h1>
                        <p className="text-lg text-slate-600 mb-8 max-w-lg">
                            {t.heroSubtitle}
                        </p>
                        <div className="flex gap-4">
                            <Link
                                to="/user"
                                className="bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-3 rounded-lg shadow-lg shadow-red-500/30 transition-all flex items-center gap-2"
                            >
                                <Activity size={20} />
                                {t.requestEmergency}
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="aspect-square rounded-full bg-blue-100/50 absolute -top-10 -right-10 w-64 h-64 blur-3xl animate-pulse" />
                        <div className="bg-white rounded-2xl shadow-xl p-6 relative z-10 border border-slate-100">
                            <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900">{t.systemActive}</div>
                                    <div className="text-xs text-slate-500">{t.monitoringRealtime}</div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-sm font-medium text-slate-700">{t.hospitalsConnected}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">12</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        <span className="text-sm font-medium text-slate-700">{t.ambulancesActive}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">8</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Role Access Section */}
                <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">{t.selectPortal}</h2>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* User Portal Card */}
                    <Link to="/user" className="group">
                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-slate-100 h-full flex flex-col items-center text-center group-hover:-translate-y-1">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t.patientHealthWorker}</h3>
                            <p className="text-slate-500 text-sm mb-6 flex-grow">{t.patientDesc}</p>
                            <span className="text-blue-600 font-medium text-sm group-hover:underline">{t.openUserPortal}</span>
                        </div>
                    </Link>

                    {/* Hospital Portal Card */}
                    <Link to="/hospital" className="group">
                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-slate-100 h-full flex flex-col items-center text-center group-hover:-translate-y-1">
                            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <Activity size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t.hospitalAdmin}</h3>
                            <p className="text-slate-500 text-sm mb-6 flex-grow">{t.hospitalDesc}</p>
                            <span className="text-green-600 font-medium text-sm group-hover:underline">{t.openHospitalPortal}</span>
                        </div>
                    </Link>

                    {/* Ambulance Portal Card */}
                    <Link to="/ambulance" className="group">
                        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-slate-100 h-full flex flex-col items-center text-center group-hover:-translate-y-1">
                            <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                                <Truck size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Ambulance Driver</h3>
                            <p className="text-slate-500 text-sm mb-6 flex-grow">Receive patient assignments and navigate to emergency locations.</p>
                            <span className="text-slate-600 font-medium text-sm group-hover:underline">Open Ambulance Portal &rarr;</span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
