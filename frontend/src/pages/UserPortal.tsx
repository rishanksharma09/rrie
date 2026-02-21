import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Loader2, MapPin, Mic, StopCircle, Map as MapIcon, LogOut, LayoutDashboard, Shield, Activity, Truck, Tag, ArrowRight, Brain, Clock, Plus } from 'lucide-react';
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
        distance?: number | string;
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

            // Update result and bookings with real-time ETA
            if (data.eta) {
                setResult(prev => {
                    if (prev && prev.assignmentId === data.assignmentId) {
                        return { ...prev, eta: data.eta };
                    }
                    // If the active result matches the ambulance, update it even if assignmentId is missing in data
                    if (prev && prev.ambulance === data.vehicleNumber) {
                        return { ...prev, eta: data.eta };
                    }
                    return prev;
                });

                setBookings(prev => prev.map(b =>
                    b.assignedAmbulance?.id === data.ambulanceId || b.assignedAmbulance?.vehicleNumber === data.vehicleNumber
                        ? { ...b, assignedAmbulance: { ...b.assignedAmbulance, eta: data.eta } }
                        : b
                ));
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
                // If current result doesn't have an ID yet but was just assigned
                if (prev && !prev.assignmentId && assignment.status === 'Dispatched') {
                    return {
                        ...prev,
                        assignmentId: assignment._id,
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
                status: orch?.status || (wantAmbulance ? 'Pending' : 'Referral Only'),
                assignmentId: orch?.assignmentId,
                risk_flags: data.risk_flags || [],
                hospitalScore: orch?.hospital?.score || 0,
                distance: orch?.hospital?.distance,
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
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 text-slate-900/5">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-teal-50/40 blur-[100px] rounded-full" />
                </div>

                {/* Language Toggle on sign-in screen - Floating Minimal */}
                <div className="absolute top-6 right-6 z-50">
                    <div className="glass-premium p-1 rounded-xl flex gap-1 border border-white/40">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLanguage('hi')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'hi' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}
                        >
                            हिं
                        </button>
                    </div>
                </div>

                <div className="max-w-md w-full glass-premium rounded-[2.5rem] p-10 border border-white shadow-2xl text-center">
                    <div className="w-20 h-20 bg-slate-900 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-900/20 rotate-3">
                        <Shield size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">{t.userPortalTitle}</h1>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed px-4">{t.signInPrompt}</p>

                    <button
                        onClick={login}
                        className="group relative w-full bg-slate-900 text-white font-bold py-5 rounded-2xl shadow-2xl shadow-slate-900/20 transition-all flex items-center justify-center gap-4 active:scale-95 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                        {t.signInGoogle}
                    </button>

                    <Link to="/" className="mt-8 inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 text-sm font-black uppercase tracking-widest transition-all">
                        <ArrowRight size={14} className="rotate-180" />
                        {t.backToHome}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
            {/* Sidebar - Desktop Only (Glass Premium) */}
            <aside className="hidden md:flex w-72 bg-white/40 backdrop-blur-3xl border-r border-slate-200/50 flex-col py-10 px-6 fixed h-full z-[100]">
                <div className="flex items-center gap-4 px-2 mb-12">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-blue-400 shadow-xl shadow-slate-900/20">
                        <Activity size={28} />
                    </div>
                    <span className="font-black text-2xl text-slate-900 tracking-tighter uppercase">RRIE</span>
                </div>

                <div className="space-y-3 flex-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Navigation</div>

                    <button
                        onClick={() => setActiveTab('analyze')}
                        className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${activeTab === 'analyze'
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                            : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
                            }`}
                    >
                        <LayoutDashboard size={22} className={activeTab === 'analyze' ? 'text-blue-400' : 'group-hover:text-blue-600'} />
                        <span className="font-bold text-sm uppercase tracking-widest">{t.analyzeSymptoms}</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${activeTab === 'bookings'
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                            : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
                            }`}
                    >
                        <MapIcon size={22} className={activeTab === 'bookings' ? 'text-blue-400' : 'group-hover:text-blue-600'} />
                        <span className="font-bold text-sm uppercase tracking-widest">{t.ambulanceTracking}</span>
                    </button>
                </div>

                <div className="pt-8 border-t border-slate-200/50">
                    <div className="glass-premium p-1 rounded-xl flex gap-1 border border-slate-200/50 mb-6">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLanguage('hi')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'hi' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}
                        >
                            हिं
                        </button>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full p-4 rounded-2xl flex items-center gap-4 text-red-600 hover:bg-red-50/50 transition-all font-bold text-sm uppercase tracking-widest group"
                    >
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
                            <LogOut size={20} />
                        </div>
                        <span>{t.logout}</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header - Sticky Minimal Glass */}
            <header className="md:hidden glass-premium border-b border-slate-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-[100]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-blue-400 shadow-lg">
                        <Activity size={22} />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tighter">RRIE</span>
                </div>
                <div className="glass-premium p-0.5 rounded-lg flex gap-0.5 border border-slate-200/50 scale-90">
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${language === 'en' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => setLanguage('hi')}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${language === 'hi' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                    >
                        हिं
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-10 mb-24 md:mb-0 overflow-x-hidden">
                {activeTab === 'analyze' ? (
                    <div className="max-w-4xl mx-auto space-y-12">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200/50">
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t.emergencyTriage}</h2>
                                <p className="text-slate-500 font-medium text-lg">{t.triageSubtitle}</p>
                            </div>
                            <div className="hidden lg:flex items-center gap-3 bg-blue-50/50 px-4 py-2 rounded-2xl border border-blue-100">
                                <Brain size={18} className="text-blue-600" />
                                <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Medical Intelligence Active</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 blur-3xl -z-10 rounded-full" />
                            <div className="p-8 md:p-12 space-y-10">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                        {t.symptomsLabel}
                                    </label>
                                    <div className="relative group">
                                        <textarea
                                            className="w-full h-48 md:h-56 p-6 md:p-10 rounded-[2rem] border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-slate-900/5 focus:ring-[15px] focus:ring-slate-900/[0.02] transition-all duration-500 outline-none text-slate-800 text-lg md:text-xl font-medium leading-relaxed shadow-inner"
                                            placeholder={t.symptomsPlaceholder}
                                            value={symptoms}
                                            onChange={(e) => setSymptoms(e.target.value)}
                                        />
                                        <button
                                            onClick={toggleRecording}
                                            className={`absolute bottom-6 right-6 md:bottom-10 md:right-10 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-300 group/mic ${isRecording
                                                ? 'bg-red-500 text-white animate-pulse shadow-red-500/40 translate-y-[-4px]'
                                                : 'bg-slate-900 text-blue-400 hover:bg-slate-800 hover:shadow-slate-900/30 hover:translate-y-[-4px]'
                                                }`}
                                        >
                                            {isRecording ? <StopCircle size={24} /> : <Mic size={24} />}
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/mic:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-widest shadow-xl">
                                                {isRecording ? 'Stop Recording' : 'Voice Input'}
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <MapPin size={12} className="text-blue-600" /> {t.yourLocation}
                                            </label>
                                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Live GPS</span>
                                        </div>
                                        <div className="p-5 md:p-6 bg-slate-50 rounded-2xl md:rounded-[1.5rem] border border-slate-100 text-slate-700 font-bold text-sm md:text-base shadow-inner flex items-center gap-4 group hover:bg-white hover:border-blue-100 transition-all duration-300">
                                            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                                            <span className="truncate flex-1">{locationText || t.detectingLocation}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Truck size={12} className="text-red-600" /> {t.ambulancePriority}
                                        </label>
                                        <div
                                            className={`group relative flex items-center gap-4 p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] border-2 transition-all duration-300 cursor-pointer overflow-hidden
                                            ${wantAmbulance
                                                    ? 'bg-red-50/50 border-red-500/30 shadow-lg shadow-red-500/5'
                                                    : 'bg-slate-50 border-slate-50 hover:bg-white hover:border-slate-200'}`}
                                            onClick={() => setWantAmbulance(!wantAmbulance)}
                                        >
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${wantAmbulance ? 'bg-red-500 border-red-500' : 'border-slate-300 group-hover:border-slate-900'}`}>
                                                {wantAmbulance && <Plus size={16} className="text-white rotate-45" />}
                                            </div>
                                            <span className={`text-sm md:text-base font-black uppercase tracking-widest leading-tight transition-colors ${wantAmbulance ? 'text-red-900' : 'text-slate-500 group-hover:text-slate-900'}`}>{t.needAmbulance}</span>
                                            {wantAmbulance && <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500" />}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || !symptoms}
                                    className={`group relative w-full py-6 md:py-8 rounded-[2rem] font-black text-xl md:text-2xl transition-all duration-300 flex items-center justify-center gap-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden
                                        ${isAnalyzing || !symptoms
                                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-slate-900/20 hover:translate-y-[-4px] active:translate-y-0'}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-white/10 to-blue-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="animate-spin text-blue-400" size={28} />
                                            {t.analyzingEmergency}
                                        </>
                                    ) : (
                                        <>
                                            <Brain size={28} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                                            {t.analyzeSymptomBtn}
                                            <ArrowRight size={24} className="opacity-50 group-hover:translate-x-2 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Result Section - Premium Dashboard Feel */}
                        {result && (
                            <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
                                <div className="glass-premium rounded-[3rem] border border-white shadow-2xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/30 blur-[100px] -z-10 rounded-full" />
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50/20 blur-[80px] -z-10 rounded-full" />

                                    <div className="bg-slate-900 px-8 md:px-12 py-8 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-blue-400/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-400/20">
                                                <Shield size={28} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-white text-2xl tracking-tight uppercase">{t.referralActive}</h3>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">{t.confidenceScore}</span>
                                                    <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-400 rounded-full" style={{ width: result.confidence }} />
                                                    </div>
                                                    <span className="text-xs text-white font-black">{result.confidence}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 md:p-12 space-y-12">
                                        <section className="relative">
                                            <div className="absolute -left-6 top-0 bottom-0 w-1.5 bg-blue-600 rounded-full" />
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.diagnosisReasoning}</label>
                                            <p className="text-xl md:text-2xl font-bold text-slate-900 leading-[1.6] tracking-tight">
                                                {result.reasoning}
                                            </p>
                                        </section>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <section className="space-y-4">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t.severityLabel}</label>
                                                <div className={`inline-flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-xl border-2 shadow-2xl transition-all hover:scale-105 duration-300 ${result.priority.toLowerCase() === 'high' ? 'bg-red-50 border-red-200 text-red-600 shadow-red-500/5' :
                                                    result.priority.toLowerCase() === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-amber-500/5' :
                                                        'bg-teal-50 border-teal-200 text-teal-600 shadow-teal-500/5'
                                                    }`}>
                                                    <div className={`w-3 h-3 rounded-full animate-pulse ${result.priority.toLowerCase() === 'high' ? 'bg-red-600' : result.priority.toLowerCase() === 'medium' ? 'bg-amber-600' : 'bg-teal-600'}`} />
                                                    {result.priority.toUpperCase()}
                                                </div>
                                            </section>

                                            {result.risk_flags && result.risk_flags.length > 0 && (
                                                <section className="space-y-4">
                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t.riskFlagsLabel}</label>
                                                    <div className="flex flex-wrap gap-3">
                                                        {result.risk_flags.map((flag, idx) => (
                                                            <div key={idx} className="bg-slate-50 text-slate-900 px-5 py-2.5 rounded-xl text-[10px] font-black border border-slate-200/50 flex items-center gap-2 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all cursor-default shadow-sm uppercase tracking-widest">
                                                                <Tag size={12} className="opacity-50" />
                                                                {flag.replace(/_/g, ' ')}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                                            <div className="bg-slate-50 p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-inner relative group hover:bg-white transition-all duration-500">
                                                <div className="absolute top-6 right-6 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                                                    <Brain size={14} className="text-blue-600" />
                                                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-tighter">AI Rec: {result.hospitalScore}%</span>
                                                </div>

                                                <label className="block text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-6">{t.assignedHospital}</label>

                                                <h4 className="text-3xl font-black text-slate-900 mb-2 leading-tight tracking-tight">{result.hospital}</h4>
                                                <p className="text-slate-500 font-bold mb-8 flex items-center gap-2 text-sm">
                                                    <MapPin size={16} className="text-blue-400" />
                                                    {result.distance ? <span className="text-slate-900">{result.distance} km</span> : ''}
                                                    <span className="opacity-50">•</span>
                                                    <span className="truncate">{result.hospitalAddress}</span>
                                                </p>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {result.hospitalContact && (
                                                        <a href={`tel:${result.hospitalContact}`} className="flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:-translate-y-1 transition-all">
                                                            {t.callHospital}
                                                        </a>
                                                    )}
                                                    {result.hospitalId && (
                                                        <button
                                                            onClick={handlePreAlert}
                                                            disabled={hospitalAlertSent || sendingAlert}
                                                            className={`relative group/btn flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all border-2 overflow-hidden
                                                            ${hospitalAlertSent
                                                                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                                                                    : sendingAlert
                                                                        ? 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse'
                                                                        : 'bg-white border-slate-900/10 text-slate-900 hover:border-slate-900 hover:-translate-y-1 shadow-sm'
                                                                }`}
                                                        >
                                                            {hospitalAlertSent ? (
                                                                <>
                                                                    <div className="w-2 h-2 bg-teal-500 rounded-full" />
                                                                    {t.hospitalNotified}
                                                                </>
                                                            ) : sendingAlert ? (
                                                                t.sending
                                                            ) : (
                                                                <>
                                                                    <div className="absolute inset-0 bg-slate-900 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                                                    <span className="relative z-10 group-hover/btn:text-white transition-colors uppercase tracking-widest text-[10px]">{t.preAlertHospital}</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={`p-8 md:p-10 rounded-[2.5rem] border shadow-2xl flex flex-col items-center justify-center text-center transition-all duration-500 hover:scale-[1.02]
                                                ${(!result.ambulance || result.status === 'Pending')
                                                    ? 'bg-slate-900 border-slate-900 shadow-slate-900/20'
                                                    : 'bg-red-600 border-red-600 shadow-red-500/20'}`}>

                                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-xl ${(!result.ambulance || result.status === 'Pending') ? 'bg-white/10 text-blue-400' : 'bg-white/10 text-white'}`}>
                                                    <Truck size={32} />
                                                </div>

                                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">{t.transportStatus}</label>

                                                <h4 className="text-3xl font-black text-white mb-2 tracking-tight">
                                                    {result.status === 'Pending' ? t.assigningAmbulance : result.ambulance}
                                                </h4>

                                                {result.status !== 'Pending' && (
                                                    <div className="inline-flex items-center gap-3 bg-black/20 text-white px-8 py-3 rounded-2xl font-black text-2xl mt-4">
                                                        <Clock size={24} className="opacity-50" />
                                                        {result.eta}
                                                    </div>
                                                )}

                                                {result.status === 'Pending' && (
                                                    <div className="flex gap-1 mt-6">
                                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Nearby Options - Bento Style */}
                                        {result.alternatives && result.alternatives.length > 0 && (
                                            <section className="pt-12 border-t border-slate-100">
                                                <div className="flex items-center gap-6 mb-10">
                                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">{t.secondaryFacilities}</h4>
                                                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {result.alternatives.map((alt: any, idx: number) => (
                                                        <div key={idx} className="group relative bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 hover:border-slate-900/5 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                                                            <div className="flex items-start justify-between gap-6 relative z-10">
                                                                <div className="space-y-4 flex-1">
                                                                    <div className="space-y-1">
                                                                        <div className="font-black text-slate-900 text-xl tracking-tight group-hover:text-blue-600 transition-colors uppercase">{alt.name}</div>
                                                                        <div className="flex items-center gap-2">
                                                                            <MapPin size={12} className="text-slate-300" />
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{alt.distance} km • {alt.location?.address || alt.address}</span>
                                                                        </div>
                                                                    </div>

                                                                    {(alt.contact || alt.contactNumber) && (
                                                                        <a href={`tel:${alt.contact || alt.contactNumber}`} className="inline-flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] bg-slate-100 px-4 py-2 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                                            {alt.contact || alt.contactNumber}
                                                                        </a>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col items-end gap-3 text-right">
                                                                    <div className="text-[10px] font-black text-blue-600 tracking-tighter bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all uppercase">
                                                                        Match: {alt.score}%
                                                                    </div>
                                                                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${alt.status?.toLowerCase() === 'active' ? 'bg-teal-50 border-teal-100 text-teal-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
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
                    <div className="max-w-7xl mx-auto space-y-10">
                        <div className="pb-4 border-b border-slate-200/50">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t.liveTracking}</h2>
                            <p className="text-slate-500 font-medium text-lg">{t.liveTrackingSubtitle}</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-auto lg:h-[700px]">
                            <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-4 custom-scrollbar max-h-[500px] lg:max-h-full">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 px-2">Active Emergency Requests</div>
                                {isLoadingBookings ? (
                                    <div className="flex flex-col items-center justify-center py-20 glass-premium rounded-[2rem]">
                                        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Live Data...</span>
                                    </div>
                                ) : bookings.length === 0 ? (
                                    <div className="glass-premium p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                                            <MapIcon size={48} />
                                        </div>
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs leading-relaxed px-6">{t.noBookings}</p>
                                    </div>
                                ) : (
                                    bookings.map((booking) => (
                                        <div key={booking._id} className="relative group">
                                            <div className={`absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r transition-opacity duration-500 opacity-0 group-hover:opacity-100 -z-10
                                                ${booking.status === 'Pending' ? 'from-yellow-400/20 to-orange-400/20' :
                                                    booking.status === 'Dispatched' ? 'from-red-400/20 to-rose-400/20' :
                                                        'from-teal-400/20 to-blue-400/20'}`} />

                                            <div className="glass-premium p-6 rounded-[2rem] border border-white hover:border-transparent transition-all cursor-pointer shadow-xl shadow-slate-200/10 group-active:scale-95">
                                                <div className="flex items-center justify-between mb-6">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${booking.status === 'Pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200/50' :
                                                        booking.status === 'Dispatched' ? 'bg-red-50 text-red-600 border-red-200/50' :
                                                            'bg-teal-50 text-teal-600 border-teal-200/50'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${booking.status === 'Pending' ? 'bg-yellow-600' : booking.status === 'Dispatched' ? 'bg-red-600' : 'bg-teal-600'}`} />
                                                            {booking.status === 'Pending' ? t.assigningAmbulance : booking.status}
                                                        </div>
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                                                        <Clock size={10} />
                                                        {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Facility</div>
                                                        <h4 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight leading-tight">{booking.assignedHospital?.name || t.emergencyCenter}</h4>
                                                    </div>

                                                    <div>
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ambulance Unit</div>
                                                        <div className={`text-xs font-black p-3 rounded-xl border flex items-center gap-3 transition-all ${booking.status === 'Pending' ? 'bg-slate-50 border-slate-100 text-slate-400 italic' : 'bg-slate-900 border-slate-900 text-white shadow-lg'}`}>
                                                            <Truck size={14} className={booking.status === 'Pending' ? 'opacity-20' : 'text-blue-400'} />
                                                            {booking.assignedAmbulance?.vehicleNumber || t.assigningAmbulance}
                                                        </div>
                                                    </div>

                                                    {booking.status !== 'Pending' && (
                                                        <div className="flex gap-2 pt-2">
                                                            <div className="bg-blue-50/50 text-blue-600 text-[10px] font-black px-4 py-2 rounded-xl border border-blue-100 flex-1 text-center shadow-sm uppercase tracking-widest">
                                                                {t.eta}: {booking.assignedAmbulance?.eta || t.calculating}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="lg:col-span-8 glass-premium rounded-[3rem] border border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] relative overflow-hidden h-[500px] lg:h-full">
                                {bookings.length > 0 ? (
                                    <>
                                        <div ref={mapContainerRef} className="w-full h-full" />
                                        {/* Premium HUD Overlay */}
                                        <div className="absolute top-6 left-6 z-10 glass-premium px-5 py-3 rounded-2xl border border-white/40 flex items-center gap-4">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Live Surveillance Active</span>
                                        </div>

                                        {bookings[0].status !== 'Pending' && bookings[0].assignedAmbulance && (
                                            <div className="absolute bottom-6 left-6 right-6 md:left-10 md:right-10 glass-premium p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-white/60 flex flex-col sm:flex-row items-center justify-between gap-6 z-10 overflow-hidden group">
                                                <div className="absolute top-0 left-0 w-2 h-full bg-red-600" />
                                                <div className="flex items-center gap-6 w-full sm:w-auto">
                                                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                        <Truck size={32} />
                                                    </div>
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.dispatchOfficer}</div>
                                                        <div className="font-black text-slate-900 text-xl tracking-tight uppercase">{bookings[0].assignedAmbulance?.driverName || 'Emergency Dispatch'}</div>
                                                        <div className="text-[10px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100 inline-block">Secure Encrypted Link</div>
                                                    </div>
                                                </div>

                                                <a
                                                    href={`tel:${bookings[0].assignedAmbulance?.contactNumber}`}
                                                    className="w-full sm:w-auto bg-slate-900 text-white px-8 py-5 rounded-[1.5rem] font-black text-sm shadow-2xl shadow-slate-900/40 hover:bg-slate-800 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 group/btn"
                                                >
                                                    <span className="uppercase tracking-widest">{t.contactDriver}</span>
                                                </a>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-slate-200 shadow-xl mb-6">
                                            <MapIcon size={48} />
                                        </div>
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{t.waitingForEmergency}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile Bottom Navigation */}
            {/* Mobile Bottom Navigation - Floating Glass */}
            <nav className="md:hidden fixed bottom-6 left-6 right-6 z-[100] h-20 glass-premium rounded-[2rem] border border-white/60 shadow-2xl flex items-center justify-around px-2">
                <button
                    onClick={() => setActiveTab('analyze')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-[80%] rounded-2xl transition-all duration-300 ${activeTab === 'analyze'
                        ? 'bg-slate-900 text-blue-400 shadow-xl shadow-slate-900/20 scale-105'
                        : 'text-slate-400'}`}
                >
                    <LayoutDashboard size={20} className={activeTab === 'analyze' ? 'animate-pulse' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.analyzeSymptoms}</span>
                </button>

                <button
                    onClick={() => setActiveTab('bookings')}
                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-[80%] rounded-2xl transition-all duration-300 ${activeTab === 'bookings'
                        ? 'bg-slate-900 text-blue-400 shadow-xl shadow-slate-900/20 scale-105'
                        : 'text-slate-400'}`}
                >
                    <MapIcon size={20} className={activeTab === 'bookings' ? 'animate-pulse' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.ambulanceTracking}</span>
                </button>

                <div className="w-[1px] h-6 bg-slate-200" />

                <button
                    onClick={logout}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 h-[80%] rounded-2xl text-red-400 transition-all active:bg-red-50"
                >
                    <LogOut size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.logout}</span>
                </button>
            </nav>
        </div>
    );
};

export default UserPortal;
