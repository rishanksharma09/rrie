import { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, Truck, AlertCircle, Check, LogOut, Wifi, ArrowRight, Gauge, Clock, Navigation2, Activity } from 'lucide-react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { io, Socket } from 'socket.io-client';

const AmbulancePortal = () => {
    const { user, logout } = useAuthStore();
    const [isBusy, setIsBusy] = useState(false);
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [ambulanceId, setAmbulanceId] = useState<string | null>(null);
    const [incomingEmergency, setIncomingEmergency] = useState<any>(null);
    const [activeMission, setActiveMission] = useState<any>(null);
    const [driverLocation, setDriverLocation] = useState<{ lng: number; lat: number }>({ lng: 77.2090, lat: 28.6139 });
    const [eta, setEta] = useState<number | null>(null);
    const socketRef = useRef<Socket | null>(null);

    // 1. Verify Role and Get Ambulance ID
    useEffect(() => {
        const verify = async () => {
            if (user && user.email) {
                try {
                    console.log("[Auth] Verifying driver:", user.email);
                    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email, role: 'ambulance' })
                    });
                    const data = await response.json();
                    console.log("[Auth] Verification response:", data);
                    if (data.authorized) {
                        setAuthorized(true);
                        setAmbulanceId(data.details.id);
                    } else {
                        setAuthorized(false);
                    }
                } catch (error) {
                    console.error("[Auth] Verification error:", error);
                    setAuthorized(false);
                }
            }
        };
        if (user) verify();
    }, [user]);

    // 2. Setup Socket Connection
    useEffect(() => {
        if (ambulanceId && !socketRef.current) {
            console.log("[Socket] Initializing driver connection for ID:", ambulanceId);
            const socket = io(import.meta.env.VITE_BACKEND_URL);
            socketRef.current = socket;

            socket.on('connect', () => {
                console.log("[Socket] Connected as driver:", socket.id);
                socket.emit('register_driver', { ambulanceId });
            });

            socket.on('registration_success', (data) => {
                console.log("[Socket] Registration successful:", data);
            });

            socket.on('NEW_EMERGENCY', (emergency) => {
                console.log("[Socket] NEW EMERGENCY ALERT:", emergency);
                setIncomingEmergency(emergency);
            });

            socket.on('assignment_confirmed', (mission) => {
                console.log("[Socket] Mission assignment confirmed.");
                setActiveMission(mission);
                setIncomingEmergency(null);
                setIsBusy(true);
            });

            socket.on('error', (err) => {
                console.error("[Socket] Error:", err);
            });

            return () => {
                socket.disconnect();
                socketRef.current = null;
            };
        }
    }, [ambulanceId]);

    // 3. Track and Emit Real-Time GPS
    useEffect(() => {
        if (!navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { longitude, latitude } = pos.coords;
                setDriverLocation({ lng: longitude, lat: latitude });

                if (socketRef.current && socketRef.current.connected && ambulanceId) {
                    socketRef.current.emit('update_location', {
                        ambulanceId,
                        coordinates: [longitude, latitude]
                    });
                }
            },
            (err) => console.error("GPS Watch error:", err),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [ambulanceId]);

    // 4. Calculate Real ETA from Mapbox
    useEffect(() => {
        const fetchETA = async () => {
            if (!activeMission || !driverLocation) return;

            try {
                const { lng: dLng, lat: dLat } = driverLocation;
                const { lng: pLng, lat: pLat } = activeMission.patientLocation;
                const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

                const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${dLng},${dLat};${pLng},${pLat}?access_token=${token}`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.routes && data.routes[0]) {
                    const durationInSeconds = data.routes[0].duration;
                    setEta(Math.ceil(durationInSeconds / 60));
                }
            } catch (error) {
                console.error("Error fetching ETA:", error);
            }
        };

        const interval = setInterval(fetchETA, 30000); // Update every 30s
        fetchETA(); // Initial fetch

        return () => clearInterval(interval);
    }, [activeMission, driverLocation]);

    const handleAccept = () => {
        if (socketRef.current && incomingEmergency && ambulanceId) {
            socketRef.current.emit('accept_emergency', {
                assignmentId: incomingEmergency.assignmentId,
                ambulanceId
            });
        }
    };

    const handleComplete = () => {
        if (socketRef.current && ambulanceId) {
            socketRef.current.emit('complete_mission', {
                ambulanceId,
                assignmentId: activeMission?._id || activeMission?.assignmentId
            });
        }
        setIsBusy(false);
        setActiveMission(null);
        setIncomingEmergency(null);
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 text-slate-100 opacity-20">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-red-100 blur-[100px] rounded-full" />
                </div>

                <div className="max-w-md w-full glass-premium rounded-[2.5rem] p-10 border border-white shadow-2xl text-center backdrop-blur-3xl bg-white/40">
                    <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-blue-600/30">
                        <Truck size={36} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-tighter">Ambulance Portal</h1>
                    <p className="text-slate-500 font-medium mb-10">Secure biometric link required for dispatch access.</p>

                    <Link to="/ambulance/login" className="group w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3">
                        Operator Sign In
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        );
    }

    if (authorized === false) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
                <div className="max-w-md w-full glass-premium rounded-[3rem] p-12 border border-red-100 shadow-2xl text-center bg-white/40 backdrop-blur-3xl">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-100">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tighter italic">Access Revoked</h2>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed">System protocols restrict your credentials from accessing the Ambulance Matrix.</p>

                    <div className="space-y-4">
                        <button onClick={() => logout()} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20">
                            Halt Authorization
                        </button>
                        <Link to="/" className="block py-2 text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:text-slate-900 transition-colors">
                            Return to Base
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (authorized === null) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Wifi size={20} className="text-blue-500 animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-slate-900 font-black text-xs uppercase tracking-[0.4em] animate-pulse">Establishing Secure Uplink</p>
                    <p className="text-blue-600/60 text-[10px] font-bold uppercase tracking-widest mt-2">Syncing Unit-402 with Command</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] relative flex flex-col h-screen overflow-hidden">
            {/* Dispatch Alert Overlay - Ultra High Priority */}
            {incomingEmergency && (
                <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center p-6 sm:p-12">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-red-600/5 rounded-full blur-[150px] animate-pulse" />
                    </div>

                    <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-[0_40px_100px_rgba(220,38,38,0.15)] border border-red-200 overflow-hidden animate-in zoom-in duration-500 relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

                        <div className="p-10 sm:p-14 flex flex-col items-center text-center">
                            <div className="relative mb-10">
                                <div className="absolute inset-0 bg-red-600 rounded-full blur-2xl opacity-20 animate-ping" />
                                <div className="w-24 h-24 bg-red-600 rounded-[2rem] flex items-center justify-center text-white relative z-10 shadow-2xl rotate-12 transition-transform hover:rotate-0">
                                    <AlertCircle size={48} strokeWidth={2.5} />
                                </div>
                            </div>

                            <h2 className="text-[10px] font-black text-red-600 uppercase tracking-[0.5em] mb-4">Urgent Dispatch Directive</h2>
                            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2 italic">
                                {incomingEmergency.triage?.emergency_type || 'EMERGENCY'}
                            </h3>
                            <p className="text-slate-500 font-bold text-sm tracking-widest uppercase mb-12 flex items-center gap-3">
                                <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                                Unit Assignment Pending
                            </p>

                            <div className="grid grid-cols-2 gap-4 w-full mb-12">
                                <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl text-left backdrop-blur-md">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Patient Severity</p>
                                    <p className="text-xl font-black text-red-600 uppercase italic tracking-tight">{incomingEmergency.triage?.severity || 'HIGH'}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl text-left backdrop-blur-md">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hospital Node</p>
                                    <p className="text-sm font-black text-slate-900 leading-tight">{incomingEmergency.hospitalName}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-full">
                                <button
                                    onClick={handleAccept}
                                    className="group relative w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-6 rounded-3xl transition-all shadow-[0_20px_50px_rgba(15,23,42,0.2)] flex items-center justify-center gap-4 active:scale-95 text-xl tracking-tight overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <Check size={28} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                                    INITIATE MISSION
                                </button>

                                <button
                                    onClick={() => {
                                        if (socketRef.current && incomingEmergency && ambulanceId) {
                                            socketRef.current.emit('pass_to_next_unit', {
                                                assignmentId: incomingEmergency.assignmentId,
                                                ambulanceId,
                                            });
                                        }
                                        setIncomingEmergency(null);
                                    }}
                                    className="w-full py-2 text-slate-400 text-[10px] font-black hover:text-slate-900 transition-colors uppercase tracking-[0.3em]"
                                >
                                    Pass to Next Unit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Overlay - Mission Control Aesthetic */}
            <div className="absolute top-6 left-6 right-6 z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pointer-events-none">
                <div className="glass-premium bg-white/70 backdrop-blur-3xl p-4 sm:p-5 rounded-[2rem] border border-white pointer-events-auto flex items-center gap-5 shadow-2xl">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl border border-white/20 flex items-center justify-center text-white shadow-2xl shadow-blue-600/30">
                        <Truck size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h1 className="font-black text-xl text-slate-900 leading-none uppercase tracking-tighter">Unit 402</h1>
                            <div className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-[8px] font-black text-blue-600 uppercase tracking-widest">Active</div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <Navigation2 size={10} className="text-blue-500" />
                            {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                        </p>
                    </div>
                </div>

                <div className="pointer-events-auto flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto">
                    <div className={`px-6 py-3 rounded-2xl font-black text-[10px] shadow-2xl flex items-center gap-3 border transition-all duration-500 tracking-[0.2em] uppercase
                        ${isBusy ? 'bg-red-50 border-red-100 text-red-600 backdrop-blur-xl' : 'bg-teal-50 border-teal-100 text-teal-600 backdrop-blur-xl'}`}>
                        <span className={`w-2 h-2 rounded-full ${isBusy ? 'bg-red-500 animate-pulse' : 'bg-teal-500 animate-pulse'}`} />
                        {isBusy ? 'Inbound Combat' : 'Awaiting Orders'}
                    </div>

                    {socketRef.current?.connected && (
                        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-[9px] font-black text-blue-600 border border-blue-100 flex items-center gap-2 shadow-xl whitespace-nowrap">
                            <Wifi size={10} />
                            UPLINK SECURED
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation Map */}
            <div className="flex-grow relative w-full h-full">
                <Map
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                    initialViewState={{
                        longitude: driverLocation.lng,
                        latitude: driverLocation.lat,
                        zoom: 14
                    }}
                    style={{ width: "100%", height: "100%" }}
                    mapStyle="mapbox://styles/mapbox/streets-v11"
                >
                    {/* Unit Position */}
                    <Marker longitude={driverLocation.lng} latitude={driverLocation.lat} anchor="center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20 scale-[2.5]" />
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl border-2 border-white/50 shadow-2xl flex items-center justify-center text-white relative z-10 rotate-45 transform">
                                <Truck size={24} className="-rotate-45" />
                            </div>
                        </div>
                    </Marker>

                    {/* Patient Position */}
                    {activeMission && (
                        <Marker
                            longitude={activeMission.patientLocation.lng}
                            latitude={activeMission.patientLocation.lat}
                            anchor="center"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-30 scale-[3]" />
                                <div className="w-10 h-10 bg-red-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white relative z-10">
                                    <MapPin size={22} />
                                </div>
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full whitespace-nowrap border-2 border-white shadow-2xl tracking-widest uppercase">
                                    Patient Extraction Node
                                </div>
                            </div>
                        </Marker>
                    )}
                </Map>
            </div>

            {/* Bottom Status Panel - Futuristic HUD */}
            <div className="absolute bottom-10 left-6 right-6 z-10 pointer-events-none flex justify-center">
                <div className="glass-premium bg-white/80 backdrop-blur-3xl border border-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] overflow-hidden w-full max-w-4xl pointer-events-auto relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600/0 via-blue-500/20 to-blue-600/0" />

                    {activeMission ? (
                        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
                            <div className="p-8 flex-grow">
                                <div className="flex items-center gap-6 mb-6">
                                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                                        <Clock size={28} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Time to Extraction</p>
                                        <div className="flex items-end gap-2">
                                            <p className="text-3xl font-black text-slate-900 leading-none uppercase italic tracking-tighter">
                                                {eta ? `${eta} MIN` : 'CALCULATING...'}
                                            </p>
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Live Est.</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between group hover:bg-slate-100 transition-colors cursor-pointer">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Extraction</p>
                                            <p className="text-xs font-bold text-slate-900 uppercase truncate max-w-[150px]">{activeMission.hospitalName || 'Node Alpha'}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform">
                                            <Navigation size={16} />
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between group hover:bg-slate-100 transition-colors">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Encryption Mode</p>
                                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Secure Uplink 2.0</p>
                                        </div>
                                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.3)]" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 flex flex-col justify-center gap-6 md:w-[300px] bg-blue-50/30">
                                <div className="text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-between mb-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocol Delta</span>
                                        <span className="px-2 py-0.5 bg-red-50 border border-red-100 rounded text-[8px] font-black text-red-600 uppercase">{activeMission.triage?.severity} Risk</span>
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Execute Transport Directive</h4>
                                </div>

                                <button
                                    onClick={handleComplete}
                                    className="group w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl transition-all shadow-[0_0_30px_rgba(15,23,42,0.1)] flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <Check size={20} strokeWidth={3} className="text-white group-hover:scale-110 transition-transform" />
                                    <span className="text-xs uppercase tracking-[0.2em] font-black">Finalize Mission</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" />
                                <div className="w-16 h-16 bg-white rounded-[1.5rem] border border-slate-100 flex items-center justify-center text-blue-600 shadow-xl relative z-10">
                                    <Gauge size={28} strokeWidth={2.5} />
                                </div>
                            </div>

                            <div className="flex-grow text-center md:text-left">
                                <h3 className="font-black text-slate-900 text-lg tracking-tight uppercase italic mb-1 flex items-center justify-center md:justify-start gap-3">
                                    <Activity size={16} className="text-teal-600 animate-pulse" />
                                    Systems Nominal
                                </h3>
                                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.15em] leading-relaxed max-w-sm">
                                    Sector 7G Monitoring Active • Latency 24ms • Unit Status: Idle
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                                <div className="flex gap-4">
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Uplink Status</p>
                                        <p className="text-[9px] font-black text-teal-600 uppercase tracking-tighter">Connected</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100" />
                                    <div className="text-right">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Signal Strength</p>
                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">98% Stable</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => logout()}
                                    className="h-12 w-12 md:w-auto md:px-5 bg-white hover:bg-red-50 border border-slate-100 hover:border-red-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-red-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2 group shadow-sm"
                                    title="Logout"
                                >
                                    <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                                    <span className="hidden md:block">Exit</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AmbulancePortal;
