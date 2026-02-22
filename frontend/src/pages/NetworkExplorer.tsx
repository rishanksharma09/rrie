import { useState, useEffect, useRef } from 'react';
import { Activity, MapPin, Search, BarChart3, Database, Globe, Zap, Bed, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const NetworkExplorer = () => {
    const [hospitals, setHospitals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/hospital/all`);
                setHospitals(response.data);
            } catch (error) {
                console.error("Failed to fetch hospital network:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHospitals();

        // Socket Initialization
        socketRef.current = io(import.meta.env.VITE_BACKEND_URL);

        socketRef.current.on('HOSPITAL_DATA_UPDATED', (updatedHospital: any) => {
            console.log("Live Update Received:", updatedHospital.name);
            setHospitals(prev => prev.map(h =>
                h._id === updatedHospital._id ? updatedHospital : h
            ));
        });

        const interval = setInterval(fetchHospitals, 60000); // Polling as slow fallback
        return () => {
            clearInterval(interval);
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const filteredHospitals = hospitals.filter((h: any) =>
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.location?.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        totalNodes: hospitals.length,
        activeNodes: hospitals.filter((h: any) => h.status === 'active').length,
        surgeNodes: hospitals.filter((h: any) => h.status === 'overloaded').length,
        totalBeds: hospitals.reduce((acc: number, h: any) => acc + (h.beds?.icuAvailable || 0) + (h.beds?.erAvailable || 0), 0)
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Global Hospital Network...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12 font-sans overflow-x-hidden">
            {/* Background Orbs */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[60%] bg-blue-100/30 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-5%] left-[10%] w-[40%] h-[50%] bg-teal-50/40 blur-[120px] rounded-full" />
            </div>

            {/* Header section */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-16">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-blue-400 shadow-2xl shadow-slate-900/20">
                            <Globe size={32} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Network Explorer</h1>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mt-2">RRIE Global Command Center</span>
                        </div>
                    </div>
                    <p className="text-slate-500 font-medium max-w-xl text-lg leading-relaxed">
                        Visualizing the real-time resource matrix across the RRIE ecosystem. Monitor live bed availability, specialist status, and orchestration nodes.
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 lg:min-w-[400px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search facility name or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-2xl font-bold text-sm shadow-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300"
                        />
                    </div>
                </div>
            </header>

            {/* Key Metrics Bento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {[
                    { label: 'Total Network Nodes', value: stats.totalNodes, icon: <Database className="text-blue-500" />, sub: 'Registered Facilities' },
                    { label: 'Active Channels', value: stats.activeNodes, icon: <Zap className="text-teal-500" />, sub: '100% Operational' },
                    { label: 'Network Surge', value: stats.surgeNodes, icon: <AlertCircle className="text-orange-500" />, sub: 'High Load Detected' },
                    { label: 'Aggregated Capacity', value: stats.totalBeds, icon: <Bed className="text-slate-900" />, sub: 'Live Bed Matrix' }
                ].map((stat, i) => (
                    <div key={i} className="glass-premium p-8 rounded-[2.5rem] border border-white shadow-xl flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center">
                            {stat.icon}
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
                            <div className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Hospital Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredHospitals.map((hospital: any) => (
                    <div key={hospital._id} className="relative group">
                        <div className={`absolute -inset-0.5 rounded-[3rem] bg-gradient-to-r transition-opacity duration-500 opacity-0 group-hover:opacity-20 -z-10
                            ${hospital.status === 'active' ? 'from-teal-500 to-emerald-500' :
                                hospital.status === 'overloaded' ? 'from-orange-500 to-amber-500' : 'from-red-600 to-rose-600'}`} />

                        <div className="glass-premium p-8 lg:p-10 rounded-[3rem] border border-white shadow-xl hover:shadow-2xl transition-all h-full flex flex-col">
                            <div className="flex justify-between items-start mb-8">
                                <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border flex items-center gap-2
                                    ${hospital.status === 'active' ? 'bg-teal-50 border-teal-200 text-teal-600' :
                                        hospital.status === 'overloaded' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${hospital.status === 'active' ? 'bg-teal-500 animate-pulse' :
                                        hospital.status === 'overloaded' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                    {hospital.status?.toUpperCase() || 'OFFLINE'}
                                </div>
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    ID: {hospital._id?.slice(-6).toUpperCase()}
                                </div>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight line-clamp-1">{hospital.name}</h3>
                            <div className="flex items-center gap-2 text-slate-400 mb-8">
                                <MapPin size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest truncate">{hospital.location?.address || hospital.address}</span>
                            </div>

                            {/* Resource Indicators */}
                            <div className="space-y-6 mb-8 mt-auto">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">ER Matrix</span>
                                        <span className={`text-[10px] font-black ${(hospital.beds?.erAvailable || 0) > 5 ? 'text-teal-600' : 'text-red-500'}`}>
                                            {hospital.beds?.erAvailable || 0} Avail.
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${(hospital.beds?.erAvailable || 0) > 10 ? 'bg-teal-500' :
                                                (hospital.beds?.erAvailable || 0) > 5 ? 'bg-orange-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(((hospital.beds?.erAvailable || 0) / 40) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">ICU Matrix</span>
                                        <span className={`text-[10px] font-black ${(hospital.beds?.icuAvailable || 0) > 3 ? 'text-blue-600' : 'text-red-500'}`}>
                                            {hospital.beds?.icuAvailable || 0} Avail.
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${(hospital.beds?.icuAvailable || 0) > 5 ? 'bg-blue-500' :
                                                (hospital.beds?.icuAvailable || 0) > 0 ? 'bg-orange-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(((hospital.beds?.icuAvailable || 0) / 20) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Specialists & Equipment */}
                            <div className="flex flex-wrap gap-2">
                                {(Object.entries(hospital.specialists || {}) as [string, any][]).map(([key, value]) => value && (
                                    <div key={key} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter flex items-center gap-1.5">
                                        <Check size={8} className="text-blue-400" />
                                        {key}
                                    </div>
                                ))}
                                {(Object.entries(hospital.equipment || {}) as [string, any][]).map(([key, value]) => value && (
                                    <div key={key} className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter flex items-center gap-1.5">
                                        <Activity size={8} />
                                        {key}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredHospitals.length === 0 && (
                    <div className="lg:col-span-3 py-40 flex flex-col items-center justify-center glass-premium rounded-[3rem] border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
                            <Activity size={48} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No Matching Facilities Found in Network</p>
                    </div>
                )}
            </div>

            {/* Orchestration Logic Footer */}
            <div className="mt-24 p-12 glass-premium rounded-[3rem] border border-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-900/[0.02] blur-3xl -z-10 rounded-full" />

                <div className="flex flex-col lg:flex-row items-center gap-10">
                    <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-blue-400 shadow-2xl shrink-0 group-hover:rotate-6 transition-transform">
                        <BarChart3 size={40} />
                    </div>
                    <div className="flex-1 space-y-4 text-center lg:text-left">
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">RRIE Orchestration Algorithm</h2>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            The engine calculates destination suitability based on <span className="text-slate-900 font-black">Live Capacity</span>, <span className="text-blue-600 font-black">Specialist Availability</span>, and <span className="text-teal-600 font-black">Geospatial Distance</span>.
                            Facilities with critical load are automatically down-ranked to prevent emergency bottlenecking.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">V2.4 CORE</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NetworkExplorer;
