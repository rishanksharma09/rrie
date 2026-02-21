import { useState } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { auth } from '../services/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const HospitalLogin = () => {
    const { setUser, setLoading } = useAuthStore();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Verify role with backend
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, role: 'hospital' })
            });

            const data = await response.json();

            if (data.authorized) {
                setUser(user); // Update store
                navigate('/hospital'); // Redirect to portal
            } else {
                await auth.signOut(); // Sign out from Firebase if unauthorized
                setUser(null);
                setError(data.message || 'Unauthorized access.');
            }

        } catch (err: any) {
            console.error("Login failed", err);
            setError(err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Activity size={40} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Hospital Login</h1>
                <p className="text-slate-500 mb-8">Authorized medical staff only.</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2 justify-center">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl transition-all shadow-sm"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Sign in with Google
                </button>
                <div className="mt-6">
                    <Link to="/" className="text-sm text-slate-400 hover:text-slate-600">Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default HospitalLogin;
