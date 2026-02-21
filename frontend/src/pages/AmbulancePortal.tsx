import { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, Truck, AlertCircle, Shield, Check } from 'lucide-react';
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
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                        <Truck size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Ambulance Portal</h1>
                    <p className="text-slate-400 text-sm mb-6">Authentication required to access dispatch.</p>
                    <Link to="/ambulance/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                        Log In Now
                    </Link>
                </div>
            </div>
        );
    }

    if (authorized === false) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-red-500/30 text-center max-w-md">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Unauthorized</h2>
                    <p className="text-slate-400 mb-6">Your account does not have driver permissions.</p>
                    <button onClick={() => logout()} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all mb-4">
                        Switch Account
                    </button>
                    <Link to="/" className="text-slate-500 text-sm hover:text-white transition-colors">Return Home</Link>
                </div>
            </div>
        );
    }

    if (authorized === null) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Establishing Secure Link...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 relative flex flex-col h-screen overflow-hidden">
            {/* Dispatch Alert Overlay */}
            {incomingEmergency && (
                <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border-4 border-red-600 overflow-hidden animate-in zoom-in duration-300">
                        <div className="bg-red-600 p-8 flex flex-col items-center text-white text-center">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                <AlertCircle size={48} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-1">Incoming Dispatch</h2>
                            <p className="opacity-80 font-bold text-sm tracking-widest">{incomingEmergency.triage?.emergency_type?.toUpperCase()} EMERGENCY</p>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Severity</p>
                                    <p className="text-lg font-black text-red-600 uppercase italic leading-tight">{incomingEmergency.triage?.severity}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hospital</p>
                                    <p className="font-bold text-slate-800 leading-tight">{incomingEmergency.hospitalName}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleAccept}
                                className="w-full bg-red-600 hover:bg-black text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-red-600/30 flex items-center justify-center gap-3 active:scale-95 group text-lg"
                            >
                                <Check size={28} className="group-hover:scale-125 transition-transform" />
                                ACCEPT MISSION
                            </button>
                            <button
                                onClick={() => {
                                    if (socketRef.current && incomingEmergency && ambulanceId) {
                                        console.log('[Pass] Emitting pass_to_next_unit:', {
                                            assignmentId: incomingEmergency.assignmentId,
                                            ambulanceId,
                                        });
                                        socketRef.current.emit('pass_to_next_unit', {
                                            assignmentId: incomingEmergency.assignmentId,
                                            ambulanceId,
                                        });
                                    } else {
                                        console.warn('[Pass] Cannot emit — missing data:', { socket: !!socketRef.current, incomingEmergency, ambulanceId });
                                    }
                                    setIncomingEmergency(null);
                                }}
                                className="w-full mt-4 py-2 text-slate-400 text-sm font-bold hover:text-slate-800 transition-colors uppercase tracking-widest"
                            >
                                Pass to Next Unit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
                <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-slate-700/50 pointer-events-auto flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-xl border border-blue-400/30 flex items-center justify-center shadow-inner">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h1 className="font-black text-white leading-tight uppercase tracking-tighter">Unit-402</h1>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Dispatch Ready</p>
                    </div>
                </div>

                <div className="pointer-events-auto flex flex-col items-end gap-2">
                    <div className={`px-4 py-2 rounded-xl font-black text-xs shadow-2xl flex items-center gap-3 border-2 transition-all duration-500 ${isBusy ? 'bg-red-600 border-red-500 text-white' : 'bg-green-600 border-green-500 text-white'}`}>
                        <div className={`w-2.5 h-2.5 rounded-full bg-white shadow-lg ${!isBusy && 'animate-pulse'}`} />
                        {isBusy ? 'MISSION ACTIVE' : 'SYSTEM ONLINE'}
                    </div>
                    {socketRef.current?.connected && (
                        <div className="bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[9px] font-bold text-green-400 border border-green-500/20">
                            IO LINK ESTABLISHED
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
                    mapStyle="mapbox://styles/mapbox/navigation-night-v1"
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
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap border-2 border-white shadow-xl">
                                    PICKUP POINT
                                </div>
                            </div>
                        </Marker>
                    )}
                </Map>
            </div>

            {/* Bottom Status Panel */}
            <div className="absolute bottom-6 left-4 right-4 z-10 pointer-events-auto">
                <div className="bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden max-w-lg mx-auto ring-1 ring-white/10">
                    {activeMission ? (
                        <div className="p-0">
                            <div className="bg-blue-600 p-6 text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-1">Mission Directive</p>
                                        <h3 className="text-2xl font-black tracking-tighter leading-none italic uppercase">
                                            {activeMission.triage?.emergency_type} Dispatch
                                        </h3>
                                    </div>
                                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur">
                                        <Navigation size={20} />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-grow bg-black/20 rounded-xl p-3 border border-white/10">
                                        <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">Destination</p>
                                        <p className="text-xs font-bold truncate">{activeMission.hospitalName || activeMission.assignedHospital?.name || 'Local Trauma Center'}</p>
                                    </div>
                                    <div className="flex-grow bg-black/20 rounded-xl p-3 border border-white/10">
                                        <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">Patient Safety</p>
                                        <p className="text-xs font-bold uppercase italic text-red-200">{activeMission.triage?.severity} RISK</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <button
                                    onClick={handleComplete}
                                    className="w-full bg-white hover:bg-blue-50 text-slate-900 font-black py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 group text-sm uppercase tracking-widest"
                                >
                                    <Check size={20} className="text-green-600 group-hover:scale-125 transition-transform" />
                                    Mission Accomplished
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-slate-900/50">
                            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-2xl shadow-inner flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <Shield size={32} />
                            </div>
                            <h3 className="font-black text-white text-xl tracking-tight uppercase italic mb-2">Unit Status: Operational</h3>
                            <p className="text-slate-500 text-xs font-bold mb-8 max-w-[280px] mx-auto uppercase tracking-widest leading-relaxed">
                                Link established with central server. GPS tether active. Monitoring for distress signals.
                            </p>

                            <div className="flex gap-3">
                                <div className="flex-grow bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-left">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Network Hub</p>
                                    <p className="text-[10px] font-black text-green-500 uppercase flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        Secure Link Sync
                                    </p>
                                </div>
                                <button
                                    onClick={() => logout()}
                                    className="px-6 bg-slate-800 hover:bg-red-900/20 border border-slate-700/50 hover:border-red-500/30 rounded-2xl text-[10px] font-black text-slate-500 hover:text-red-500 transition-all uppercase tracking-widest"
                                >
                                    Halt
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
