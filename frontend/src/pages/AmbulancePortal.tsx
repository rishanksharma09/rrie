import { useState, useEffect } from 'react';
import { Navigation, MapPin, Truck, AlertCircle } from 'lucide-react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const AmbulancePortal = () => {
    const { user, login, logout } = useAuthStore();
    const [isBusy, setIsBusy] = useState(false);
    const [navigating, setNavigating] = useState(false);
    const [authorized, setAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const verify = async () => {
            if (user && user.email) {
                try {
                    const response = await fetch('http://localhost:5000/api/auth/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email, role: 'ambulance' })
                    });
                    const data = await response.json();
                    if (data.authorized) {
                        setAuthorized(true);
                    } else {
                        setAuthorized(false);
                        // Optional: logout() if strictly enforcing no cross-login
                    }
                } catch (error) {
                    console.error("Verification error", error);
                    setAuthorized(false);
                }
            }
        };
        if (user) verify();
    }, [user]);

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Ambulance Portal</h1>
                    <Link to="/ambulance/login" className="text-blue-600 hover:underline">Go to Login</Link>
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
                    <p className="text-slate-600 mb-6">Your account is not authorized for the Ambulance Portal.</p>
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
        <div className="min-h-screen bg-slate-200 relative flex flex-col h-screen">
            {/* Top Header Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/20 pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white">
                            <Truck size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 leading-tight">Unit-402</h1>
                            <div className="text-xs text-slate-500">Advanced Life Support</div>
                            <div className="text-[10px] text-blue-600 font-medium">Operator: {user.displayName}</div>
                        </div>
                    </div>
                </div>

                <div className="pointer-events-auto">
                    <button
                        onClick={() => setIsBusy(!isBusy)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-colors
             ${isBusy ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                    >
                        {isBusy ? 'BUSY / EN ROUTE' : 'AVAILABLE'}
                    </button>

                </div>
            </div>

            {/* Map Placeholder */}
            {/* Mapbox Integration */}
            <div className="flex-grow relative w-full h-full">
                <Map
                    mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                    initialViewState={{
                        longitude: 77.2090,
                        latitude: 28.6139,
                        zoom: 13
                    }}
                    style={{ width: "100%", height: "100%" }}
                    mapStyle="mapbox://styles/mapbox/streets-v11"
                >
                    <Marker longitude={77.2090} latitude={28.6139} anchor="bottom">
                        <div className="w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white relative z-10">
                            <Truck size={18} />
                        </div>
                    </Marker>

                    {navigating && (
                        <Marker longitude={77.23} latitude={28.65} anchor="bottom" color="#ef4444" />
                    )}
                </Map>

                {!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur p-6 rounded-xl shadow-2xl text-center border border-red-200 z-50">
                        <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                            <MapPin size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 mb-1">Mapbox Token Missing</h3>
                        <p className="text-sm text-slate-500 max-w-xs">
                            Please add <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">VITE_MAPBOX_ACCESS_TOKEN</code> to your .env file to enable the live map.
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom Floating Panel */}
            <div className="absolute bottom-6 left-4 right-4 z-10 pointer-events-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-lg mx-auto border border-slate-100">
                    {isBusy ? (
                        <div className="p-0">
                            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                                <div>
                                    <div className="text-xs font-medium text-blue-200 uppercase tracking-wider">Current Assignment</div>
                                    <div className="font-bold text-lg">Cardiac Emergency</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">8 min</div>
                                    <div className="text-xs text-blue-200">ETA</div>
                                </div>
                            </div>

                            <div className="p-4 grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">DESTINATION</div>
                                    <div className="font-bold text-slate-900">124 Maple Avenue</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 mb-1">DISTANCE</div>
                                    <div className="font-bold text-slate-900">4.2 km</div>
                                </div>
                            </div>

                            <div className="p-4 pt-0">
                                {navigating ? (
                                    <button
                                        onClick={() => { setNavigating(false); setIsBusy(false); }}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-500/30"
                                    >
                                        Mark Arrived at Scene
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setNavigating(true)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                                    >
                                        <Navigation size={18} /> Start Navigation
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <Navigation size={28} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">Unit Available</h3>
                            <p className="text-slate-500 text-sm mb-6">Waiting for dispatch instructions...</p>
                            <button
                                onClick={() => setIsBusy(true)}
                                className="text-blue-600 font-medium text-sm hover:underline"
                            >
                                Simulate Incoming Assignment
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AmbulancePortal;
