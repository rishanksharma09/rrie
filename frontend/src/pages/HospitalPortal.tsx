import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, Bed, Bell, Activity, AlertCircle, X, Wifi, LogOut, Settings, BarChart3, ClipboardList, Shield, Clipboard, MapPin, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { io, Socket } from 'socket.io-client';

const HospitalPortal = () => {
    const { user, logout } = useAuthStore();
    const [hospitalData, setHospitalData] = useState<any>(null);
    const [hospitalId, setHospitalId] = useState<string | null>(null);
    const [beds, setBeds] = useState({ icu: 4, er: 12 });
    const [staff, setStaff] = useState({
        neuro: false, cardio: false, ortho: false, peds: false,
        ct: false, mri: false, vent: false, cath: false
    });
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
    const [socketConnected, setSocketConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const verifyAndFetch = async () => {
            if (user && user.email) {
                try {
                    // 1. Verify Role
                    const authResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email, role: 'hospital' })
                    });
                    const authData = await authResponse.json();

                    if (authData.authorized) {
                        setAuthorized(true);
                        setHospitalId(authData.details.id);
                        // 2. Fetch Hospital Data
                        const dataResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/hospital?email=${user.email}`);
                        if (dataResponse.ok) {
                            const data = await dataResponse.json();
                            setHospitalData(data);
                            // Initialize state from DB data
                            if (data.beds) {
                                setBeds({
                                    icu: data.beds.icuAvailable || 0,
                                    er: data.beds.erAvailable || 0
                                });
                            }
                            if (data.specialists) {
                                setStaff({
                                    neuro: data.specialists?.neurologist || false,
                                    cardio: data.specialists?.cardiologist || false,
                                    ortho: data.specialists?.orthopedic || false,
                                    peds: data.specialists?.pediatrician || false,
                                    ct: data.equipment?.ctScan || false,
                                    mri: data.equipment?.mri || false,
                                    vent: data.equipment?.ventilator || false,
                                    cath: data.equipment?.cathLab || false
                                });
                            }
                        }
                    } else {
                        setAuthorized(false);
                    }
                } catch (error) {
                    console.error("Verification/Fetch error", error);
                    setAuthorized(false);
                }
            }
        };
        if (user) verifyAndFetch();
    }, [user]);

    // Connect socket once hospital ID is known
    useEffect(() => {
        if (!hospitalId || socketRef.current) return;

        const socket = io(import.meta.env.VITE_BACKEND_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('register_hospital', { hospitalId });
            setSocketConnected(true);
            console.log('[Socket] Hospital portal connected:', socket.id);
        });

        socket.on('INCOMING_PATIENT', (alertData) => {
            console.log('[Socket] Incoming patient alert:', alertData);
            setLiveAlerts(prev => [{ ...alertData, id: Date.now() }, ...prev]);
        });

        socket.on('disconnect', () => setSocketConnected(false));

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [hospitalId]);

    const handleUpdate = async () => {
        if (!user?.email || !hospitalData) return;

        try {
            const updates = {
                beds: {
                    ...hospitalData.beds,
                    icuAvailable: beds.icu,
                    erAvailable: beds.er
                },
                specialists: {
                    ...hospitalData.specialists,
                    neurologist: staff.neuro,
                    cardiologist: staff.cardio,
                    orthopedic: staff.ortho,
                    pediatrician: staff.peds
                },
                equipment: {
                    ...hospitalData.equipment,
                    ctScan: staff.ct,
                    mri: staff.mri,
                    ventilator: staff.vent,
                    cathLab: staff.cath
                },
                status: hospitalData.status // Include updated status
            };

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/hospital`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, updates })
            });

            if (response.ok) {
                alert("Facility status updated successfully!");
            } else {
                alert("Failed to update status.");
            }
        } catch (error) {
            console.error("Update error", error);
            alert("Error updating status.");
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 text-slate-900/5">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-teal-50/40 blur-[100px] rounded-full" />
                </div>

                <div className="max-w-md w-full glass-premium rounded-[2.5rem] p-10 border border-white shadow-2xl text-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-blue-400 mx-auto mb-8 shadow-2xl shadow-slate-900/20">
                        <Activity size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Hospital Portal</h1>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed">Secure gateway for medical facility staff. Please authenticate to manage bed availability and live alerts.</p>

                    <Link to="/hospital/login" className="block w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all hover:translate-y-[-2px] active:translate-y-0">
                        Go to Secure Login
                    </Link>

                    <div className="mt-8">
                        <Link to="/" className="text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-slate-900 transition-colors">← Return Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (authorized === false) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="max-w-md w-full glass-premium rounded-[2.5rem] p-10 border border-white shadow-2xl text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-8">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter uppercase">Access Denied</h2>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed">Your account is not authorized as a verified Health Facility admin. Contact support if you believe this is an error.</p>

                    <button onClick={() => logout()} className="w-full py-5 bg-red-600/10 text-red-600 rounded-2xl font-black text-lg border border-red-200 hover:bg-red-600 hover:text-white transition-all">
                        Sign Out
                    </button>

                    <div className="mt-8">
                        <Link to="/" className="text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-slate-900 transition-colors">Back to Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (authorized === null) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Authenticating Secure Layer...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans overflow-x-hidden">
            {/* Gradient Orbs Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[50%] bg-blue-100/30 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-5%] left-[10%] w-[30%] h-[40%] bg-teal-50/40 blur-[100px] rounded-full" />
            </div>

            {/* Desktop Sidebar - Premium Style */}
            <aside className="hidden lg:flex w-80 bg-white/40 backdrop-blur-3xl border-r border-slate-200/50 flex-col py-10 px-8 fixed h-full z-[100]">
                <div className="flex items-center gap-4 px-2 mb-12">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-blue-400 shadow-xl shadow-slate-900/20">
                        <Activity size={28} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-2xl text-slate-900 tracking-tighter uppercase leading-none">RRIE</span>
                        <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.4em] mt-1">Hospital</span>
                    </div>
                </div>

                <div className="space-y-6 flex-1">
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-3">Management</div>

                        <button className="w-full p-4 rounded-2xl flex items-center gap-4 bg-slate-900 text-white shadow-xl shadow-slate-900/20 transition-all">
                            <LayoutDashboard size={20} className="text-blue-400" />
                            <span className="font-bold text-sm uppercase tracking-widest">Dashboard</span>
                        </button>

                        <button className="w-full p-4 rounded-2xl flex items-center gap-4 text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 transition-all group">
                            <ClipboardList size={20} className="group-hover:text-blue-600" />
                            <span className="font-bold text-sm uppercase tracking-widest">Registrations</span>
                        </button>

                        <button className="w-full p-4 rounded-2xl flex items-center gap-4 text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 transition-all group">
                            <Settings size={20} className="group-hover:text-blue-600" />
                            <span className="font-bold text-sm uppercase tracking-widest">Settings</span>
                        </button>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-3">Analytics</div>
                        <button className="w-full p-4 rounded-2xl flex items-center gap-4 text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 transition-all group">
                            <BarChart3 size={20} className="group-hover:text-blue-600" />
                            <span className="font-bold text-sm uppercase tracking-widest">Performance</span>
                        </button>
                    </div>
                </div>

                <div className="mt-auto space-y-4">
                    <div className="p-5 glass-premium rounded-[1.5rem] border border-slate-200/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                                {user?.displayName?.[0] || 'A'}
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-black text-slate-900 uppercase truncate">{user?.displayName}</div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">Administrator</div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => logout()}
                        className="w-full p-5 rounded-[1.5rem] border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/5">
                        <LogOut size={18} />
                        Terminate Session
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 glass-premium border-b border-slate-200/50 px-6 py-4 flex items-center justify-between z-[100]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-blue-400 shadow-lg">
                        <Activity size={22} />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tighter">RRIE</span>
                </div>
                <button onClick={() => logout()} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
                    <LogOut size={18} />
                </button>
            </header>

            <main className="flex-1 lg:ml-80 p-6 lg:p-12 pb-32 lg:pb-12 mt-16 lg:mt-0">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">{hospitalData ? hospitalData.name : 'Loading...'}</h1>
                        <div className="flex items-center gap-4">
                            <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest flex items-center gap-2 
                                ${hospitalData?.status === 'active' ? 'bg-teal-50 border-teal-200 text-teal-600' :
                                    hospitalData?.status === 'overloaded' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse 
                                    ${hospitalData?.status === 'active' ? 'bg-teal-500' :
                                        hospitalData?.status === 'overloaded' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                Facility Status: {hospitalData?.status || 'Offline'}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Shield size={12} className="text-blue-400" />
                                Secured Node
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-white/60">
                        <div className="glass-premium px-5 py-3 rounded-xl border border-white shadow-sm flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Beds</span>
                            <span className="text-xl font-black text-slate-900">{beds.icu + beds.er}</span>
                        </div>
                        <div className="glass-premium px-5 py-3 rounded-xl border border-white shadow-sm flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live Alerts</span>
                            <span className="text-xl font-black text-red-600">{liveAlerts.length}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Panel: Facility Controls */}
                    <div className="lg:col-span-4 space-y-8">
                        <section className="glass-premium rounded-[2.5rem] border border-white shadow-2xl p-8 md:p-10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 blur-3xl -z-10 rounded-full group-hover:bg-blue-100/50 transition-colors" />

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900">
                                    <Bed size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Resource Management</h2>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Availability Shift</div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'active', label: 'Operational', color: 'teal', icon: <Wifi size={14} /> },
                                            { id: 'overloaded', label: 'Surge Delay', color: 'orange', icon: <AlertCircle size={14} /> },
                                            { id: 'offline', label: 'Offline', color: 'red', icon: <X size={14} /> }
                                        ].map(status => (
                                            <button
                                                key={status.id}
                                                onClick={() => {
                                                    setHospitalData({ ...hospitalData, status: status.id });
                                                    if (status.id === 'overloaded') setBeds({ icu: 0, er: 0 });
                                                }}
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 font-black text-xs uppercase tracking-widest
                                                    ${hospitalData?.status === status.id
                                                        ? `bg-${status.color}-500 text-white border-${status.color}-500 shadow-xl shadow-${status.color}-500/20 translate-x-1`
                                                        : 'bg-white text-slate-400 border-slate-50 hover:border-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {status.icon}
                                                    {status.label}
                                                </div>
                                                {hospitalData?.status === status.id && <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">ICU Capacity</span>
                                            <span className="text-xl font-black text-blue-600">{beds.icu}<span className="text-slate-200 text-sm ml-1">/ 20</span></span>
                                        </div>
                                        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${(beds.icu / 20) * 100}%` }} />
                                            <input
                                                type="range" min="0" max="20" value={beds.icu}
                                                onChange={(e) => setBeds({ ...beds, icu: parseInt(e.target.value) })}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">ER Capacity</span>
                                            <span className="text-xl font-black text-teal-600">{beds.er}<span className="text-slate-200 text-sm ml-1">/ 40</span></span>
                                        </div>
                                        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="absolute top-0 left-0 h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${(beds.er / 40) * 100}%` }} />
                                            <input
                                                type="range" min="0" max="40" value={beds.er}
                                                onChange={(e) => setBeds({ ...beds, er: parseInt(e.target.value) })}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="glass-premium rounded-[2.5rem] border border-white shadow-2xl p-8 md:p-10 relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900">
                                    <Users size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Personnel & Assets</h2>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Medical Specialists</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'neuro', label: 'Neuro', icon: <Activity size={12} /> },
                                            { id: 'cardio', label: 'Cardio', icon: <Activity size={12} /> },
                                            { id: 'ortho', label: 'Ortho', icon: <Activity size={12} /> },
                                            { id: 'peds', label: 'Peds', icon: <Activity size={12} /> }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => setStaff(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof prev] }))}
                                                className={`p-3 rounded-xl border flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest
                                                    ${staff[item.id as keyof typeof staff]
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                        : 'bg-white text-slate-400 border-slate-50 hover:border-slate-200'}`}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Diagnostic Assets</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'ct', label: 'CT Scan', icon: <ClipboardList size={12} /> },
                                            { id: 'mri', label: 'MRI', icon: <ClipboardList size={12} /> },
                                            { id: 'vent', label: 'Ventilator', icon: <Activity size={12} /> },
                                            { id: 'cath', label: 'Cath Lab', icon: <Settings size={12} /> }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => setStaff(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof prev] }))}
                                                className={`p-3 rounded-xl border flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest
                                                    ${staff[item.id as keyof typeof staff]
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                                                        : 'bg-white text-slate-400 border-slate-50 hover:border-slate-200'}`}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdate}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/40 hover:bg-slate-800 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 mt-6"
                                >
                                    <Clipboard />
                                    Broadcast Updates
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: Incoming Alerts */}
                    <div className="lg:col-span-8 flex flex-col gap-8">
                        <section className="glass-premium rounded-[3rem] border border-white shadow-2xl flex-1 flex flex-col overflow-hidden">
                            <div className="p-8 md:p-10 border-b border-slate-100/50 flex justify-between items-center bg-white/30">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                                        <Bell size={24} className="text-red-500 animate-bounce" />
                                        Emergency Referral Feed
                                    </h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 ml-9">Real-time incoming ambulance alerts</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all
                                        ${socketConnected ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`} />
                                            {socketConnected ? 'System Live' : 'Reconnecting...'}
                                        </div>
                                    </div>
                                    {liveAlerts.length > 0 && (
                                        <div className="bg-red-600 text-white text-[10px] font-black px-3 py-2 rounded-xl shadow-lg shadow-red-600/20 animate-pulse">
                                            {liveAlerts.length} URGENT
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 md:p-10 space-y-6 overflow-y-auto flex-grow custom-scrollbar max-h-[800px]">
                                {liveAlerts.map(alert => (
                                    <div key={alert.id} className="relative group animate-in slide-in-from-top duration-500">
                                        <div className={`absolute -inset-0.5 rounded-[2.5rem] bg-gradient-to-r transition-opacity duration-500 opacity-20 -z-10
                                            ${alert.severity === 'High' || alert.severity === 'Critical' ? 'from-red-600 to-rose-600' : 'from-orange-500 to-amber-500'}`} />

                                        <div className="glass-premium p-6 md:p-8 rounded-[2.5rem] border border-white shadow-xl hover:shadow-2xl transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/20 blur-3xl -z-10 rounded-full" />

                                            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                                                <div className="flex items-start gap-6">
                                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-2xl flex-shrink-0 group-hover:rotate-6 transition-transform
                                                        ${alert.severity === 'High' || alert.severity === 'Critical' ? 'bg-red-600 shadow-red-600/20' : alert.severity === 'Medium' ? 'bg-orange-500 shadow-orange-500/20' : 'bg-yellow-500 shadow-yellow-500/20'}`}>
                                                        {(alert.emergency_type?.[0] || '?').toUpperCase()}
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h3 className="text-xl font-black text-slate-900 capitalize tracking-tight leading-none">{alert.emergency_type} Emergency</h3>
                                                                <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border
                                                                    ${alert.severity === 'High' || alert.severity === 'Critical' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                                                                    {alert.severity} Severity
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                <MapPin size={10} className="text-blue-500" />
                                                                Inbound Tracking: <span className="text-slate-900">{alert.ambulanceUnit || 'M-DISPATCH'}</span>
                                                            </div>
                                                        </div>

                                                        {alert.reasoning && (
                                                            <div className="relative pl-6 py-1">
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-100 rounded-full" />
                                                                <p className="text-sm text-slate-500 italic leading-relaxed">{alert.reasoning}</p>
                                                            </div>
                                                        )}

                                                        {alert.risk_flags?.length > 0 && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {alert.risk_flags.map((flag: string) => (
                                                                    <div key={flag} className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter">
                                                                        <AlertCircle size={10} className="text-red-400" />
                                                                        {flag.replace(/_/g, ' ')}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-slate-100">
                                                    <div className="flex-1 md:flex-none text-right">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Broadcasted</div>
                                                        <div className="text-sm font-black text-slate-900 uppercase">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setLiveAlerts(prev => prev.filter(a => a.id !== alert.id))}
                                                        className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-600 border border-slate-100 hover:border-red-100 transition-all flex items-center justify-center shrink-0"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {liveAlerts.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-40 glass-premium rounded-[2.5rem] border border-dashed border-slate-200">
                                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6 animate-pulse">
                                            <Activity size={48} />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center px-10 leading-loose">
                                            Scanning Secured Network for Inbound Patient Matrix
                                        </p>
                                        <div className="flex items-center gap-3 mt-8">
                                            <Loader2 size={16} className="text-blue-400 animate-spin" />
                                            <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Surveillance Active</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HospitalPortal;
