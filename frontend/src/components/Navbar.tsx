import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Activity, Shield, Truck, Home, LogOut, Database } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const Navbar = () => {
    const { user, logout } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const links = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Demonstration', path: '/network', icon: Database },
        { name: 'User Portal', path: '/user', icon: Shield },
        { name: 'Hospital', path: '/hospital', icon: Activity },
        { name: 'Ambulance', path: '/ambulance', icon: Truck },
    ];

    const isPortal = location.pathname.startsWith('/user') ||
        location.pathname.startsWith('/hospital') ||
        location.pathname.startsWith('/ambulance') ||
        location.pathname.startsWith('/network');

    if (isPortal) return null;

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'
            }`}>
            <div className="max-w-7xl mx-auto px-6">
                <div className={`glass-premium rounded-2xl flex items-center justify-between h-16 px-6 transition-all border border-white/40 shadow-xl ${scrolled ? 'bg-white/80' : 'bg-white/40'
                    }`}>
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center group">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-transform">
                                <Activity size={22} className="text-blue-400" />
                            </div>
                            <span className="font-black text-2xl text-slate-900 tracking-tighter">RRIE</span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex md:items-center">
                        <div className="flex space-x-1 items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                            {links.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 uppercase tracking-widest
                                    ${isActive(link.path)
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                >
                                    <link.icon size={14} className={isActive(link.path) ? 'text-blue-600' : ''} />
                                    {link.name}
                                </Link>
                            ))}
                        </div>

                        {user && (
                            <button
                                onClick={logout}
                                className="ml-6 flex items-center gap-2 text-xs font-black text-red-600 uppercase tracking-widest hover:text-red-700 transition-colors"
                            >
                                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500">
                                    <LogOut size={16} />
                                </div>
                                <span>Logout</span>
                            </button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu - Improved with slide down */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 px-6 pt-2 md:hidden">
                    <div className="glass-premium rounded-2xl p-4 space-y-2 border border-white/60 shadow-2xl animate-in slide-in-from-top-4">
                        {links.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all
                                ${isActive(link.path)
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <link.icon size={18} />
                                {link.name}
                            </Link>
                        ))}
                        {user && (
                            <button
                                onClick={() => { logout(); setIsOpen(false); }}
                                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold text-red-600 uppercase tracking-widest hover:bg-red-50 transition-all border-t border-slate-100 mt-2 pt-2"
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
