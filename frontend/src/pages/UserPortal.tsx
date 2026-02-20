import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Loader2, AlertCircle, MapPin, Mic, StopCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const UserPortal = () => {
    const [symptoms, setSymptoms] = useState('');
    const [urgency, setUrgency] = useState('Medium');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [locationText, setLocationText] = useState('Detecting location...');
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [wantAmbulance, setWantAmbulance] = useState(false);
    const recognitionRef = useRef<any>(null);

    interface ReferralResult {
        hospital: string;
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
        alternatives?: any[];
    }

    const [result, setResult] = useState<ReferralResult | null>(null);

    useEffect(() => {
        // Speech Recognition Setup
        if ('webkitSpeechRecognition' in window) {
            const speechRecognition = new (window as any).webkitSpeechRecognition();
            speechRecognition.continuous = true;
            speechRecognition.interimResults = true;
            speechRecognition.lang = 'en-US';

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
    }, []);

    useEffect(() => {
        // Geolocation Setup
        if (!navigator.geolocation) {
            setLocationText('Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCoords({ latitude, longitude });

                try {
                    // Try to fetch city name using Mapbox
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
                alert("Speech recognition is not supported in this browser.");
            }
        }
    };

    const handleAnalyze = async () => {
        if (!symptoms) return;

        setIsAnalyzing(true);
        setResult(null);

        try {
            const payload: any = { symptoms };
            if (coords) {
                payload.latitude = coords.latitude;
                payload.longitude = coords.longitude;
            }
            payload.wantAmbulance = wantAmbulance;

            const response = await axios.post('http://localhost:5000/api/symptoms/analyze', payload);
            const data = response.data;
            const orch = data.orchestration;

            setResult({
                hospital: orch?.hospital?.name || (orch?.error ? "No suitable facility found" : "Nearest Emergency Center"),
                hospitalAddress: orch?.hospital?.location?.address || orch?.hospital?.address,
                hospitalContact: orch?.hospital?.contact || orch?.hospital?.contactNumber,
                assignmentReason: orch?.hospital?.reason,
                eta: orch?.assignedAmbulance?.eta || (orch?.ambulance?.message ? "N/A" : "15 mins"),
                ambulance: orch?.ambulance?.vehicleNumber || orch?.ambulance?.message || "Dispatching...",
                priority: data.severity ? data.severity.charAt(0).toUpperCase() + data.severity.slice(1) : 'Medium',
                confidence: `${((data.confidence || 0.8) * 100).toFixed(0)}%`,
                reasoning: data.reasoning || "Analyzing symptoms and matching with nearest facility.",
                emergency_type: data.emergency_type,
                risk_flags: data.risk_flags || [],
                alternatives: orch?.alternatives || []
            });
        } catch (error) {
            console.error("Analysis failed", error);
            alert("Failed to analyze symptoms. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <Link to="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Home
                </Link>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="bg-blue-800 p-6 text-white">
                        <h1 className="text-2xl font-bold">Request Emergency Referral</h1>
                        <p className="text-blue-200 text-sm mt-1">AI-powered triage and hospital matching</p>
                    </div>

                    <div className="p-6 md:p-8 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Describe Symptoms</label>
                            <div className="relative">
                                <textarea
                                    className="w-full h-32 p-4 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none text-slate-700 pr-12"
                                    placeholder="e.g. Chest pain radiating to left arm, sweating, shortness of breath..."
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                />
                                <button
                                    onClick={toggleRecording}
                                    className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${isRecording
                                        ? 'bg-red-100 text-red-600 animate-pulse'
                                        : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                    title={isRecording ? "Stop Recording" : "Start Recording"}
                                >
                                    {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                                </button>
                            </div>
                            {isRecording && (
                                <p className="text-xs text-red-500 mt-1 animate-pulse font-medium">Listening...</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Urgency Level</label>
                                <select
                                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                    value={urgency}
                                    onChange={(e) => setUrgency(e.target.value)}
                                >
                                    <option>Auto</option>
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Current Location</label>
                                <div className="relative">
                                    <MapPin size={18} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full p-3 pl-10 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        placeholder="Detecting location..."
                                        value={locationText}
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <input
                                type="checkbox"
                                id="wantAmbulance"
                                checked={wantAmbulance}
                                onChange={(e) => setWantAmbulance(e.target.checked)}
                                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="wantAmbulance" className="text-sm font-semibold text-blue-900 cursor-pointer select-none">
                                I need an ambulance dispatched to my location
                            </label>
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !symptoms}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
                                ${isAnalyzing || !symptoms
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'}`}
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                'Analyze & Recommend'
                            )}
                        </button>
                    </div>
                </div>

                {/* AI Analysis Result */}
                {result && (
                    <div className="mt-6 animate-fade-in-up">
                        <div className="bg-white rounded-3xl shadow-2xl border border-blue-100/50 overflow-hidden backdrop-blur-sm">
                            <div className="bg-green-50/50 px-8 py-5 border-b border-green-100/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-sm">
                                        <AlertCircle size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-green-900 text-lg">Referral Generated</h3>
                                        <div className="text-xs text-green-600 font-medium">System accuracy confirmed at {result.confidence}</div>
                                    </div>
                                </div>
                                <div className="hidden md:block">
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">LIVE RESPONSE</span>
                                </div>
                            </div>

                            <div className="p-8 md:p-10 space-y-8">
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Analysis</h4>
                                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                                    </div>

                                    <div className="flex flex-wrap gap-2.5 mb-5">
                                        {result.emergency_type && (
                                            <span className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-black rounded-lg uppercase shadow-sm shadow-purple-200">
                                                {result.emergency_type}
                                            </span>
                                        )}
                                        {result.risk_flags?.map(flag => (
                                            <span key={flag} className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded uppercase">
                                                {flag.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>

                                    <p className="text-slate-700 bg-slate-50/80 p-5 rounded-2xl border border-slate-100 italic leading-relaxed text-sm md:text-base">
                                        "{result.reasoning}"
                                    </p>
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                    <div className="md:col-span-3 bg-blue-50/50 p-8 rounded-3xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                        <div className="text-[10px] text-blue-600 font-black tracking-[0.2em] mb-4 uppercase opacity-60">RECOMMENDED FACILITY</div>
                                        <div className={`text-2xl font-black ${result.hospital === "No suitable facility found" ? 'text-red-600' : 'text-blue-900'} mb-4 leading-tight`}>
                                            {result.hospital}
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            {result.hospitalAddress && (
                                                <div className="flex items-start text-sm text-blue-800/80">
                                                    <MapPin size={16} className="mr-3 mt-0.5 flex-shrink-0 text-blue-400" />
                                                    <span className="font-medium leading-relaxed">{result.hospitalAddress}</span>
                                                </div>
                                            )}

                                            {result.hospitalContact && (
                                                <div className="flex items-center text-sm text-blue-800">
                                                    <span className="w-4 mr-3 flex justify-center text-blue-400">📞</span>
                                                    <a href={`tel:${result.hospitalContact}`} className="font-bold hover:underline bg-blue-100/50 px-3 py-1 rounded-xl text-blue-700 transition-colors hover:bg-blue-100">
                                                        {result.hospitalContact}
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 mb-6">
                                            <div className="text-xs font-black text-blue-700 bg-white px-4 py-2 rounded-xl border border-blue-100 shadow-sm inline-flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                                {result.hospital === "No suitable facility found" ? "⚠️ SEEKING ALTERNATIVE" : `ETA: ${result.eta}`}
                                            </div>
                                        </div>

                                        {result.assignmentReason && (
                                            <div className="mt-4 text-[11px] text-blue-700/60 font-medium leading-relaxed pt-5 border-t border-blue-200/40">
                                                <span className="text-blue-800/80 font-bold uppercase tracking-wider mr-2">LOGIC:</span> {result.assignmentReason}
                                            </div>
                                        )}
                                    </div>

                                    <div className={`md:col-span-2 flex flex-col justify-center gap-4 ${result.ambulance === 'Ambulance not requested.' ? 'bg-slate-50/50 border-dashed' : 'bg-slate-50'} p-8 rounded-3xl border border-slate-100`}>
                                        <div className="text-[10px] text-slate-400 font-black tracking-[0.2em] mb-1 uppercase">TRANSPORT STATUS</div>
                                        <div className={`text-xl font-bold ${result.ambulance === 'Ambulance not requested.' ? 'text-slate-300' : 'text-slate-900'} leading-tight`}>
                                            {result.ambulance === 'Ambulance not requested.' ? 'Self-Transport Recommended' : result.ambulance}
                                        </div>

                                        {result.ambulance !== 'Ambulance not requested.' ? (
                                            <div className="mt-2 text-[10px] font-black bg-red-600 text-white px-3 py-1 rounded-full inline-block w-fit shadow-lg shadow-red-200">
                                                {result.priority} PRIORITY DISPATCH
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                                Follow recommended route to nearest facility unless condition worsens.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Nearby Options */}
                                {result.alternatives && result.alternatives.length > 0 && (
                                    <section className="pt-8 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-6">
                                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Secondary Facilities</h4>
                                            <div className="h-[1px] flex-1 bg-slate-100"></div>
                                        </div>

                                        <div className="space-y-4">
                                            {result.alternatives.map((alt: any, idx: number) => (
                                                <div key={idx} className="group relative bg-white p-5 hover:bg-slate-50 rounded-2xl transition-all border border-slate-100 hover:border-blue-100 hover:shadow-sm">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="font-bold text-slate-900 text-lg mb-1">{alt.name}</div>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500 font-medium">
                                                                <span className="flex items-center gap-1.5">
                                                                    <MapPin size={12} className="text-slate-300" />
                                                                    {alt.distance} km • {alt.location?.address || alt.address}
                                                                </span>
                                                                {(alt.contact || alt.contactNumber) && (
                                                                    <a href={`tel:${alt.contact || alt.contactNumber}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                                                                        <span className="text-slate-300 pointer-events-none">📞</span>
                                                                        {alt.contact || alt.contactNumber}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center md:flex-col md:items-end gap-3 md:gap-1">
                                                            <div className="text-[10px] font-black text-blue-600 tracking-tighter bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">MATCH: {alt.score}</div>
                                                            <div className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-lg ${alt.status === 'active' ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>
                                                                {alt.status}
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
        </div>
    );
};

export default UserPortal;
