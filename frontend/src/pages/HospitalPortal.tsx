import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, Bed, Bell, Activity, AlertCircle, X, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { io, Socket } from 'socket.io-client';

const HospitalPortal = () => {
    const { user, login, logout } = useAuthStore();
    const [hospitalData, setHospitalData] = useState<any>(null);
    const [hospitalId, setHospitalId] = useState<string | null>(null);
    const [beds, setBeds] = useState({ icu: 4, er: 12 });
    const [staff, setStaff] = useState({
        neuro: false, cardio: false, ortho: false, peds: false,
        ct: false, mri: false, vent: false, cath: false
    });
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [loadingData, setLoadingData] = useState(false);
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
                        setLoadingData(true);
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
                        setLoadingData(false);
                    } else {
                        setAuthorized(false);
                    }
                } catch (error) {
                    console.error("Verification/Fetch error", error);
                    setAuthorized(false);
                    setLoadingData(false);
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Hospital Portal</h1>
                    <Link to="/hospital/login" className="text-blue-600 hover:underline">Go to Login</Link>
                </div>
            </div>
        );
    }

    if (authorized === false) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-600 mb-6">Your account is not authorized for the Hospital Portal.</p>
                    <button onClick={() => logout()} className="text-red-600 font-medium hover:underline">Sign Out</button>
                    <div className="mt-4">
                        <Link to="/" className="text-slate-400 text-sm hover:text-slate-600">Back to Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (authorized === null) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">


            <main className="flex-grow p-6 grid md:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
                {/* Dashboard Title */}
                <div className="md:col-span-12 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                            <LayoutDashboard size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 text-lg leading-tight">{hospitalData ? hospitalData.name : 'Loading...'}</h1>
                            <div className={`text-xs font-medium flex items-center gap-1 
                                ${hospitalData?.status === 'active' ? 'text-green-600' :
                                    hospitalData?.status === 'overloaded' ? 'text-orange-600' : 'text-red-600'}`}>
                                <span className={`w-2 h-2 rounded-full animate-pulse 
                                    ${hospitalData?.status === 'active' ? 'bg-green-500' :
                                        hospitalData?.status === 'overloaded' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                {hospitalData?.status ? hospitalData.status.toUpperCase() : 'LOADING'}
                            </div>
                        </div>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-slate-800">Welcome, {user.displayName}</div>
                    </div>
                </div>

                {/* Left Panel: Facility Controls */}
                <div className="md:col-span-4 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Bed size={18} className="text-slate-400" />
                            Bed Availability
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-800 mb-2">Hospital Status</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setHospitalData({ ...hospitalData, status: 'active' })}
                                        className={`py-2 px-1 rounded-lg text-sm font-medium border transition-colors ${hospitalData?.status === 'active'
                                            ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-500/20'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        Active
                                    </button>
                                    <button
                                        onClick={() => {
                                            setHospitalData({ ...hospitalData, status: 'overloaded' });
                                            setBeds({ icu: 0, er: 0 });
                                        }}
                                        className={`py-2 px-1 rounded-lg text-sm font-medium border transition-colors ${hospitalData?.status === 'overloaded'
                                            ? 'bg-orange-50 border-orange-200 text-orange-700 ring-2 ring-orange-500/20'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        Overloaded
                                    </button>
                                    <button
                                        onClick={() => setHospitalData({ ...hospitalData, status: 'offline' })}
                                        className={`py-2 px-1 rounded-lg text-sm font-medium border transition-colors ${hospitalData?.status === 'offline'
                                            ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500/20'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        Offline
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">ICU Beds</span>
                                    <span className="font-bold text-slate-900">{beds.icu} / 20</span>
                                </div>
                                <input
                                    type="range" min="0" max="20" value={beds.icu}
                                    onChange={(e) => setBeds({ ...beds, icu: parseInt(e.target.value) })}
                                    className="w-full accent-blue-600"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">ER Beds</span>
                                    <span className="font-bold text-slate-900">{beds.er} / 40</span>
                                </div>
                                <input
                                    type="range" min="0" max="40" value={beds.er}
                                    onChange={(e) => setBeds({ ...beds, er: parseInt(e.target.value) })}
                                    className="w-full accent-green-600"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Users size={18} className="text-slate-400" />
                            Specialists & Equipment
                        </h2>
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2">Specialists</h3>
                            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">Neurologist</span>
                                <input type="checkbox" checked={staff.neuro} onChange={(e) => setStaff({ ...staff, neuro: e.target.checked })} className="w-5 h-5 accent-blue-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">Cardiologist</span>
                                <input type="checkbox" checked={staff.cardio} onChange={(e) => setStaff({ ...staff, cardio: e.target.checked })} className="w-5 h-5 accent-blue-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">Orthopedic</span>
                                <input type="checkbox" checked={staff.ortho} onChange={(e) => setStaff({ ...staff, ortho: e.target.checked })} className="w-5 h-5 accent-blue-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">Pediatrician</span>
                                <input type="checkbox" checked={staff.peds} onChange={(e) => setStaff({ ...staff, peds: e.target.checked })} className="w-5 h-5 accent-blue-600 rounded" />
                            </label>

                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-4">Equipment</h3>
                            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">CT Scan</span>
                                <input type="checkbox" checked={staff.ct} onChange={(e) => setStaff({ ...staff, ct: e.target.checked })} className="w-5 h-5 accent-blue-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">MRI Machine</span>
                                <input type="checkbox" checked={staff.mri} onChange={(e) => setStaff({ ...staff, mri: e.target.checked })} className="w-5 h-5 accent-blue-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">Ventilator</span>
                                <input type="checkbox" checked={staff.vent} onChange={(e) => setStaff({ ...staff, vent: e.target.checked })} className="w-5 h-5 accent-blue-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer">
                                <span className="text-sm font-medium text-slate-700">Cath Lab</span>
                                <input type="checkbox" checked={staff.cath} onChange={(e) => setStaff({ ...staff, cath: e.target.checked })} className="w-5 h-5 accent-blue-600 rounded" />
                            </label>
                        </div>
                        <button
                            onClick={handleUpdate}
                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors">
                            Update Facility Status
                        </button>
                    </div>
                </div>

                {/* Right Panel: Incoming Alerts */}
                <div className="md:col-span-8">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <Bell size={18} className="text-red-500" />
                                Incoming Patient Alerts
                            </h2>
                            <div className="flex items-center gap-2">
                                {socketConnected ? (
                                    <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                                        <Wifi size={12} />
                                        LIVE
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">
                                        Connecting...
                                    </span>
                                )}
                                {liveAlerts.length > 0 && (
                                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                                        {liveAlerts.length} Active
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto flex-grow">
                            {liveAlerts.map(alert => (
                                <div key={alert.id} className="border-2 border-red-100 bg-red-50/30 rounded-xl p-4 flex items-start justify-between gap-4 animate-in slide-in-from-top duration-300">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white flex-shrink-0
                                            ${alert.severity === 'High' || alert.severity === 'Critical' ? 'bg-red-500' : alert.severity === 'Medium' ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                                            {(alert.emergency_type?.[0] || '?').toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 capitalize">{alert.emergency_type} Emergency</h3>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${alert.severity === 'High' || alert.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                    }`}>{alert.severity} SEVERITY</span>
                                                {alert.ambulanceUnit && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">Unit: {alert.ambulanceUnit}</span>}
                                                {alert.patientName && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Patient: {alert.patientName}</span>}
                                            </div>
                                            {alert.reasoning && <p className="text-xs text-slate-500 mt-2 italic max-w-sm">{alert.reasoning}</p>}
                                            {alert.risk_flags?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {alert.risk_flags.map((flag: string) => (
                                                        <span key={flag} className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase">{flag.replace(/_/g, ' ')}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-[10px] text-slate-400 mt-2">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setLiveAlerts(prev => prev.filter(a => a.id !== alert.id))}
                                        className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 mt-1"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}

                            {liveAlerts.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Activity size={40} className="mb-4 opacity-30" />
                                    <p className="font-bold text-sm">Monitoring for incoming patients...</p>
                                    <p className="text-xs mt-1">Alerts will appear here in real time</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HospitalPortal;
