import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Loader2, MapPin, Mic, StopCircle, Map as MapIcon, LogOut, LayoutDashboard, Shield, Activity, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import mapboxgl from 'mapbox-gl';
import { io, Socket } from 'socket.io-client';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

const UserPortal = () => {
    const [symptoms, setSymptoms] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [locationText, setLocationText] = useState('');
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [wantAmbulance, setWantAmbulance] = useState(false);
    const [activeTab, setActiveTab] = useState<'analyze' | 'bookings'>('analyze');
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [hospitalAlertSent, setHospitalAlertSent] = useState(false);
    const [sendingAlert, setSendingAlert] = useState(false);
    const { user, login, logout } = useAuthStore();
    const { language, setLanguage } = useLanguage();
    const t = translations[language];
    const recognitionRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const patientMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const ambulanceMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const socketRef = useRef<Socket | null>(null);

    // Set Mapbox access token
    if (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    }

    interface ReferralResult {
        hospital: string;
        hospitalId?: string;
        hospitalAddress?: string;
        hospitalContact?: string;
        assignmentReason?: string;
        eta: string;
        ambulance: string;
        priority: string;
        confidence: string;
        reasoning: string;
        emergency_type?: string;
        risk_flags?: string[];
        hospitalScore?: string | number;
        alternatives?: any[];
        status?: string;
        assignmentId?: string;
    }

    const [result, setResult] = useState<ReferralResult | null>(null);

    // Speech Recognition Setup — re-runs when language changes
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const speechRecognition = new (window as any).webkitSpeechRecognition();
            speechRecognition.continuous = true;
            speechRecognition.interimResults = true;
            speechRecognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

            speechRecognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setSymptoms(prev => prev + (prev ? ' ' : '') + finalTranscript);
                }
            };

            speechRecognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsRecording(false);
            };

            speechRecognition.onend = () => {
                setIsRecording(false);
            };

            recognitionRef.current = speechRecognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [language]); // re-init when language changes

    // Initialize socket as soon as user logs in (not on tab switch)
    useEffect(() => {
        if (!user || socketRef.current) return;

        const socket = io(import.meta.env.VITE_BACKEND_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("[Socket] User portal connected:", socket.id);
            socket.emit('register_user', { userId: user.uid });
        });

        // Live ambulance location
        socket.on('DRIVER_LIVE_LOCATION', (data) => {
            console.log("[Socket] Live location update:", data);
            if (ambulanceMarkerRef.current && mapRef.current) {
                const newCoords: [number, number] = [data.coordinates[0], data.coordinates[1]];
                ambulanceMarkerRef.current.setLngLat(newCoords);
                mapRef.current.easeTo({ center: newCoords, duration: 1000 });
            }
        });

        // Assignment confirmation
        socket.on('EMERGENCY_ASSIGNED', (assignment) => {
            console.log("[Socket] Emergency assigned:", assignment);
            setBookings(prev => {
                const exists = prev.find(b => b._id === assignment._id);
                if (exists) return prev.map(b => b._id === assignment._id ? assignment : b);
                return [assignment, ...prev];
            });

            // Update the active result block if it matches this assignment
            setResult(prev => {
                if (prev && prev.assignmentId === assignment._id) {
                    return {
                        ...prev,
                        status: assignment.status,
                        ambulance: assignment.assignedAmbulance?.vehicleNumber || prev.ambulance,
                        eta: assignment.assignedAmbulance?.eta || prev.eta
                    };
                }
                return prev;
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user]);

    // Geolocation Setup
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationText('Location detection not supported');
            return;
        }

        setLocationText('Detecting location...');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCoords({ latitude, longitude });

                try {
                    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
                    if (token) {
                        const response = await fetch(
                            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&types=place,locality`
                        );
                        const data = await response.json();
                        const city = data.features?.[0]?.text;

                        if (city) {
                            setLocationText(`${city} (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`);
                        } else {
                            setLocationText(`${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`);
                        }
                    } else {
                        setLocationText(`${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`);
                    }
                } catch (error) {
                    console.error("Error fetching location name:", error);
                    setLocationText(`${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`);
                }
            },
            (error) => {
                console.error("Error getting location:", error);
                if (error.code === 1) {
                    setLocationText('Location permission denied');
                } else {
                    setLocationText('Error detecting location');
                }
            }
        );
    }, []);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                    setIsRecording(true);
                } catch (error) {
                    console.error("Error starting speech recognition:", error);
                }
            } else {
                alert('Speech recognition is not supported in this browser.');
            }
        }
    };

    const handleAnalyze = async () => {
        if (!symptoms || !user) return;

        setIsAnalyzing(true);
        setResult(null);

        try {
            const token = await user.getIdToken();
            const payload: any = { symptoms };
            if (coords) {
                payload.latitude = coords.latitude;
                payload.longitude = coords.longitude;
            }
            payload.wantAmbulance = wantAmbulance;
            payload.language = language; // pass language so Gemini responds in the right language

            const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/symptoms/analyze`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;
            const orch = data.orchestration;

            setHospitalAlertSent(false);
            setResult({
                hospital: orch?.hospital?.name || (orch?.error ? "No suitable facility found" : "Nearest Emergency Center"),
                hospitalId: orch?.hospital?.id?.toString(),
                hospitalAddress: orch?.hospital?.location?.address || orch?.hospital?.address,
                hospitalContact: orch?.hospital?.contact || orch?.hospital?.contactNumber,
                assignmentReason: orch?.hospital?.reason,
                eta: orch?.assignedAmbulance?.eta || (orch?.ambulance?.message ? "N/A" : t.calculating),
                ambulance: orch?.assignedAmbulance?.vehicleNumber || orch?.ambulance?.vehicleNumber || (orch?.ambulance?.message ? orch.ambulance.message : t.assigningAmbulance),
                priority: data.severity ? data.severity.charAt(0).toUpperCase() + data.severity.slice(1) : 'Medium',
                confidence: `${((data.confidence || 0.8) * 100).toFixed(0)}%`,
                reasoning: data.reasoning || "Analyzing symptoms and matching with nearest facility.",
                emergency_type: data.emergency_type,
                status: orch?.status || 'Pending',
                assignmentId: orch?.assignmentId,
                risk_flags: data.risk_flags || [],
                hospitalScore: orch?.hospital?.score || 0,
                alternatives: orch?.alternatives || []
            });

            if (orch?.assignmentId) {
                fetchBookings();
            }
        } catch (error) {
            console.error("Analysis failed", error);
            alert('Failed to analyze symptoms. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePreAlert = () => {
        if (!result?.hospitalId || !socketRef.current) return;
        setSendingAlert(true);

        socketRef.current.emit('notify_hospital', {
            hospitalId: result.hospitalId,
            alertData: {
                emergency_type: result.emergency_type || 'General',
                severity: result.priority,
                reasoning: result.reasoning,
                risk_flags: result.risk_flags || [],
                ambulanceUnit: result.ambulance,
                patientName: user?.displayName || 'Anonymous Patient'
            }
        });

        socketRef.current.once('hospital_notified', ({ success }: { success: boolean }) => {
            setSendingAlert(false);
            setHospitalAlertSent(success);
            if (!success) alert('Hospital portal is not online right now. Try again later.');
        });
    };

    const fetchBookings = async () => {
        if (!user) return;
        setIsLoadingBookings(true);
        try {
            const token = await user.getIdToken();
            const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/assignments/my-bookings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const activeDispatches = response.data.filter((b: any) =>
                ['Pending', 'Dispatched', 'Arrived'].includes(b.status)
            );
            setBookings(activeDispatches);
        } catch (error) {
            console.error("Failed to fetch bookings", error);
        } finally {
            setIsLoadingBookings(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'bookings') {
            fetchBookings();
        }
    }, [activeTab]);

    // Tracking Map logic
    useEffect(() => {
        if (activeTab === 'bookings' && bookings.length > 0 && mapContainerRef.current) {
            const latestBooking = bookings[0];
            const hasLocation = latestBooking.patientLocation &&
                latestBooking.assignedAmbulance?.id?.location?.coordinates;

            if (!hasLocation) {
                console.log("[Map] Missing location data for booking:", latestBooking);
                return;
            }

            const patientLngLat: [number, number] = [latestBooking.patientLocation.lng, latestBooking.patientLocation.lat];
            const ambCoords = latestBooking.assignedAmbulance.id.location.coordinates;
            const ambulanceLngLat: [number, number] = [ambCoords[0], ambCoords[1]];

            if (!mapRef.current) {
                console.log("[Map] Initializing new map instance");
                const map = new mapboxgl.Map({
                    container: mapContainerRef.current,
                    style: 'mapbox://styles/mapbox/navigation-night-v1',
                    center: patientLngLat,
                    zoom: 13,
                    attributionControl: false
                });

                map.on('load', () => {
                    console.log("[Map] Map loaded successfully");
                    map.resize();
                });

                mapRef.current = map;

                const patientEl = document.createElement('div');
                patientEl.className = 'patient-marker';
                patientEl.style.width = '16px';
                patientEl.style.height = '16px';
                patientEl.style.backgroundColor = '#ef4444';
                patientEl.style.borderRadius = '50%';
                patientEl.style.border = '3px solid white';
                patientEl.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.8)';

                patientMarkerRef.current = new mapboxgl.Marker(patientEl)
                    .setLngLat(patientLngLat)
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<b>Your Location</b>'))
                    .addTo(map);

                const ambulanceEl = document.createElement('div');
                ambulanceEl.className = 'ambulance-marker';
                ambulanceEl.innerHTML = `
                    <div style="background: white; border-radius: 50%; width: 40px; height: 40px; display: flex; items-center; justify-content: center; border: 2px solid #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); animation: pulse 2s infinite;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="1" y="3" width="15" height="13"></rect>
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                            <circle cx="5.5" cy="18.5" r="2.5"></circle>
                            <circle cx="18.5" cy="18.5" r="2.5"></circle>
                        </svg>
                    </div>
                `;

                ambulanceMarkerRef.current = new mapboxgl.Marker(ambulanceEl)
                    .setLngLat(ambulanceLngLat)
                    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<b>Ambulance Dispatched</b>'))
                    .addTo(map);

                const bounds = new mapboxgl.LngLatBounds().extend(patientLngLat).extend(ambulanceLngLat);
                map.fitBounds(bounds, { padding: 80, animate: false });
            } else {
                console.log("[Map] Updating existing map biomarkers");
                patientMarkerRef.current?.setLngLat(patientLngLat);
                ambulanceMarkerRef.current?.setLngLat(ambulanceLngLat);
                mapRef.current.easeTo({ center: ambulanceLngLat, duration: 1000 });
            }
        }

        return () => {
            if (mapRef.current) {
                console.log("[Map] Cleaning up map instance");
                mapRef.current.remove();
                mapRef.current = null;
                patientMarkerRef.current = null;
                ambulanceMarkerRef.current = null;
            }
        };
    }, [bookings, activeTab]);

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                {/* Language Toggle on sign-in screen */}
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
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-blue-500/10 p-8 border border-slate-100 text-center">
                    <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">{t.userPortalTitle}</h1>
                    <p className="text-slate-500 mb-8">{t.signInPrompt}</p>
                    <button
                        onClick={login}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                        {t.signInGoogle}
                    </button>
                    <Link to="/" className="mt-6 inline-block text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
                        {t.backToHome}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col items-center md:items-stretch py-8 px-4 fixed h-full z-20">
                <div className="hidden md:flex items-center gap-3 px-4 mb-10">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <Activity size={24} />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tight">RRIE</span>
                </div>

                <div className="space-y-2 flex-1">
                    <button
                        onClick={() => setActiveTab('analyze')}
                        className={`w-full p-4 md:p-3 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'analyze'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <LayoutDashboard size={22} />
                        <span className="hidden md:block font-bold">{t.analyzeSymptoms}</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`w-full p-4 md:p-3 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'bookings'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <MapIcon size={22} />
                        <span className="hidden md:block font-bold">{t.ambulanceTracking}</span>
                    </button>
                </div>

                {/* Language Toggle in Sidebar */}
                <div className="hidden md:flex gap-2 py-4 px-1">
                    <button
                        onClick={() => setLanguage('en')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${language === 'en' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}`}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => setLanguage('hi')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${language === 'hi' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300'}`}
                    >
                        हिं
                    </button>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <button
                        onClick={logout}
                        className="w-full p-4 md:p-3 rounded-2xl flex items-center gap-3 text-red-500 hover:bg-red-50 transition-all font-bold"
                    >
                        <LogOut size={22} />
                        <span className="hidden md:block">{t.logout}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-20 md:ml-64 p-4 md:p-10">
                {activeTab === 'analyze' ? (
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900">{t.emergencyTriage}</h2>
                                <p className="text-slate-500 font-medium">{t.triageSubtitle}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="p-8 md:p-10 space-y-8">
                                <div>
                                    <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-4">{t.symptomsLabel}</label>
                                    <div className="relative group">
                                        <textarea
                                            className="w-full h-48 p-6 rounded-3xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none text-slate-700 text-lg leading-relaxed shadow-inner"
                                            placeholder={t.symptomsPlaceholder}
                                            value={symptoms}
                                            onChange={(e) => setSymptoms(e.target.value)}
                                        />
                                        <button
                                            onClick={toggleRecording}
                                            className={`absolute bottom-6 right-6 p-4 rounded-2xl shadow-xl transition-all ${isRecording
                                                ? 'bg-red-500 text-white animate-pulse shadow-red-500/30'
                                                : 'bg-white text-slate-400 hover:text-blue-600 hover:shadow-blue-500/10'
                                                }`}
                                        >
                                            {isRecording ? <StopCircle size={24} /> : <Mic size={24} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="block text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <MapPin size={14} /> {t.yourLocation}
                                        </label>
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 font-bold text-sm shadow-inner">
                                            {locationText || t.detectingLocation}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            {t.ambulancePriority}
                                        </label>
                                        <div className="flex items-center gap-3 bg-red-50 p-5 rounded-2xl border border-red-100 transition-all hover:bg-red-100/50 cursor-pointer" onClick={() => setWantAmbulance(!wantAmbulance)}>
                                            <input
                                                type="checkbox"
                                                checked={wantAmbulance}
                                                onChange={(e) => setWantAmbulance(e.target.checked)}
                                                className="w-6 h-6 text-red-600 border-red-200 rounded-lg focus:ring-red-500"
                                            />
                                            <span className="text-sm font-black text-red-900 leading-tight">{t.needAmbulance}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || !symptoms}
                                    className={`w-full py-6 rounded-[2rem] font-black text-xl transition-all flex items-center justify-center gap-4 shadow-2xl
                                        ${isAnalyzing || !symptoms
                                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98]'}`}
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="animate-spin" size={24} />
                                            {t.analyzingEmergency}
                                        </>
                                    ) : (
                                        <>
                                            <Activity size={24} />
                                            {t.analyzeSymptomBtn}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Result Section */}
                        {result && (
                            <div className="animate-fade-in-up pb-20">
                                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-blue-100/50 overflow-hidden">
                                    <div className="bg-green-50/50 px-10 py-6 border-b border-green-100/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                                                <Shield size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-green-900 text-xl tracking-tight">{t.referralActive}</h3>
                                                <p className="text-xs text-green-600 font-bold uppercase tracking-widest">{t.confidenceScore}: {result.confidence}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-10 space-y-10">
                                        <section>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">{t.diagnosisReasoning}</div>
                                            <p className="text-xl font-bold text-slate-800 leading-relaxed italic border-l-4 border-blue-500 pl-6 bg-blue-50/30 py-4 rounded-r-2xl">
                                                "{result.reasoning}"
                                            </p>
                                        </section>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                                <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">{t.assignedHospital}</div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-2xl font-black text-slate-900">{result.hospital}</h4>
                                                    <div className="text-[10px] font-black text-blue-600 tracking-tighter bg-white px-2 py-1 rounded-lg border border-blue-100 shadow-sm">
                                                        {t.matchScore}: {result.hospitalScore}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-500 font-medium mb-6">{result.hospitalAddress}</p>
                                                <div className="flex flex-col gap-3">
                                                    {result.hospitalContact && (
                                                        <a href={`tel:${result.hospitalContact}`} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                                                            {t.callHospital}
                                                        </a>
                                                    )}
                                                    {result.hospitalId && (
                                                        <button
                                                            onClick={handlePreAlert}
                                                            disabled={hospitalAlertSent || sendingAlert}
                                                            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all border-2 ${hospitalAlertSent
                                                                ? 'bg-green-50 border-green-300 text-green-700 cursor-default'
                                                                : sendingAlert
                                                                    ? 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse cursor-wait'
                                                                    : 'bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100 hover:border-yellow-400 hover:shadow-lg'
                                                                }`}
                                                        >
                                                            {hospitalAlertSent ? t.hospitalNotified : sendingAlert ? t.sending : t.preAlertHospital}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={`p-8 rounded-[2rem] border-2 flex flex-col justify-center ${(!result.ambulance || result.status === 'Pending') ? 'border-dashed border-slate-200 bg-white' : 'border-red-100 bg-red-50/30'}`}>
                                                <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-4">{t.transportStatus}</div>
                                                <h4 className="text-2xl font-black text-slate-900 mb-2">
                                                    {result.status === 'Pending' ? t.assigningAmbulance : result.ambulance}
                                                </h4>
                                                {result.status !== 'Pending' && (
                                                    <div className="text-lg font-bold text-red-600">{t.eta}: {result.eta}</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Nearby Options */}
                                        {result.alternatives && result.alternatives.length > 0 && (
                                            <section className="pt-10 border-t border-slate-100">
                                                <div className="flex items-center gap-2 mb-8">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t.secondaryFacilities}</h4>
                                                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {result.alternatives.map((alt: any, idx: number) => (
                                                        <div key={idx} className="group relative bg-white p-6 hover:bg-slate-50 rounded-3xl transition-all border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1">
                                                                    <div className="font-bold text-slate-900 text-lg mb-1">{alt.name}</div>
                                                                    <div className="flex flex-col gap-2 text-xs text-slate-500 font-medium">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <MapPin size={12} className="text-slate-300" />
                                                                            {alt.distance} km • {alt.location?.address || alt.address}
                                                                        </span>
                                                                        {(alt.contact || alt.contactNumber) && (
                                                                            <a href={`tel:${alt.contact || alt.contactNumber}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                                                                                <span className="text-slate-300 pointer-events-none text-[10px] w-3 flex justify-center">📞</span>
                                                                                {alt.contact || alt.contactNumber}
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2">
                                                                    <div className="text-[10px] font-black text-blue-600 tracking-tighter bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">{t.matchScore}: {alt.score}</div>
                                                                    <div className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-lg ${alt.status === 'active' || alt.status === 'Active' ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>
                                                                        {alt.status || 'Active'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900">{t.liveTracking}</h2>
                            <p className="text-slate-500 font-medium">{t.liveTrackingSubtitle}</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
                            <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                {isLoadingBookings ? (
                                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
                                ) : bookings.length === 0 ? (
                                    <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center">
                                        <MapIcon className="mx-auto text-slate-200 mb-4" size={48} />
                                        <p className="text-slate-400 font-bold">{t.noBookings}</p>
                                    </div>
                                ) : (
                                    bookings.map((booking) => (
                                        <div key={booking._id} className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-blue-500/30 transition-all cursor-pointer shadow-lg shadow-slate-200/50 group">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-600' :
                                                    booking.status === 'Dispatched' ? 'bg-red-100 text-red-600' :
                                                        'bg-green-100 text-green-600'}`}>
                                                    {booking.status === 'Pending' ? t.assigningAmbulance : booking.status}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">{new Date(booking.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <h4 className="font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight">{booking.assignedHospital?.name || t.emergencyCenter}</h4>
                                            <p className="text-xs text-slate-500 font-bold mb-4">{booking.assignedAmbulance?.vehicleNumber || t.assigningAmbulance}</p>
                                            {booking.status !== 'Pending' && (
                                                <div className="flex gap-2">
                                                    <div className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-lg border border-blue-100 flex-1 text-center">{t.eta}: {booking.assignedAmbulance?.eta || t.calculating}</div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl relative overflow-hidden">
                                {bookings.length > 0 ? (
                                    <div className="w-full h-full relative">
                                        <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-slate-50" style={{ width: '100%', height: '100%' }} />
                                        {/* HUD Overlay */}
                                        {bookings[0]?.assignedAmbulance?.id?.contactNumber && (
                                            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/50 flex items-center justify-between z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                                                        <Truck size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.ambulanceDriver2}</div>
                                                        <div className="font-black text-slate-900">{bookings[0].assignedAmbulance.id.driverName || t.dispatchOfficer}</div>
                                                    </div>
                                                </div>
                                                <a href={`tel:${bookings[0].assignedAmbulance.id.contactNumber}`} className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all flex items-center gap-2">
                                                    {t.contactDriver}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                        <p className="text-slate-400 font-medium">{t.selectBooking}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default UserPortal;
