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
    const recognitionRef = useRef<any>(null);

    interface ReferralResult {
        hospital: string;
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

            const response = await axios.post('http://localhost:5000/api/symptoms/analyze', payload);
            const data = response.data;
            const orch = data.orchestration;

            setResult({
                hospital: orch?.hospital ? orch.hospital.name : "Nearest Emergency Center",
                eta: orch?.assignedAmbulance?.eta || "15 mins",
                ambulance: orch?.ambulance?.vehicleNumber || "Dispatching...",
                priority: data.severity.charAt(0).toUpperCase() + data.severity.slice(1),
                confidence: `${(data.confidence * 100).toFixed(0)}%`,
                reasoning: data.reasoning,
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
                        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
                            <div className="bg-green-50 p-4 border-b border-green-100 flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                    <AlertCircle size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-green-800">Referral Generated</h3>
                                    <div className="text-xs text-green-600">AI Confidence: {result.confidence}</div>
                                </div>
                            </div>

                            <div className="p-6">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Analysis</h4>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    {result.emergency_type && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded uppercase">
                                            {result.emergency_type}
                                        </span>
                                    )}
                                    {result.risk_flags?.map(flag => (
                                        <span key={flag} className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded uppercase">
                                            {flag.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>

                                <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                    "{result.reasoning}"
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <div className="text-xs text-blue-600 font-semibold mb-1">RECOMMENDED HOSPITAL</div>
                                    <div className="text-lg font-bold text-blue-900">{result.hospital}</div>
                                    <div className="text-sm text-blue-700 mt-1">ETA: {result.eta}</div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="text-xs text-slate-500 font-semibold mb-1">ASSIGNED AMBULANCE</div>
                                    <div className="text-lg font-bold text-slate-900">{result.ambulance}</div>
                                    <div className="mt-2 inline-block px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded">
                                        {result.priority} PRIORITY
                                    </div>
                                </div>
                            </div>

                            {/* Nearby Options */}
                            {result.alternatives && result.alternatives.length > 0 && (
                                <div className="mt-4 border-t border-slate-100 pt-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Nearby Facilities</h4>
                                    <div className="space-y-2">
                                        {result.alternatives.map((alt: any) => (
                                            <div key={alt.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{alt.name}</div>
                                                    <div className="text-xs text-slate-500">{alt.distance} km away</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-blue-600">Score: {alt.score}</div>
                                                    <div className={`text-[10px] font-bold uppercase ${alt.status === 'active' ? 'text-green-600' : 'text-orange-600'
                                                        }`}>
                                                        {alt.status}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserPortal;
