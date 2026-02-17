import React from 'react';
import { Activity, Building2, LayoutDashboard, Menu, Users, Siren } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

type View = 'dashboard' | 'user-portal' | 'hospital-portal' | 'surge';

interface MainLayoutProps {
    currentView: View;
    onNavigate: (view: View) => void;
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentView, onNavigate, children }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const navItems = [
        { id: 'user-portal', label: 'User Portal', subLabel: 'New Patient Request', icon: Users, color: 'text-blue-600' },
        { id: 'dashboard', label: 'Orchestration', subLabel: 'Live Operations', icon: LayoutDashboard, color: 'text-indigo-600' },
        { id: 'hospital-portal', label: 'Hospital Resources', subLabel: 'Manage Availability', icon: Building2, color: 'text-emerald-600' },
        { id: 'surge', label: 'Surge Simulation', subLabel: 'Stress Test Network', icon: Siren, color: 'text-red-600' },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Background Decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-3xl opacity-60 animate-float" />
                <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-indigo-100/50 blur-3xl opacity-60 animate-float" style={{ animationDelay: '2s' }} />
                <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] rounded-full bg-emerald-50/50 blur-3xl opacity-60 animate-float" style={{ animationDelay: '4s' }} />
            </div>

            {/* Sidebar */}
            <aside
                className={clsx(
                    "fixed inset-y-0 left-0 z-30 transition-all duration-500 ease-in-out flex flex-col glass border-r border-slate-200/50",
                    isSidebarOpen ? "w-72" : "w-20"
                )}
            >
                <div className="h-20 flex items-center px-5 border-b border-slate-100/50 justify-between">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                                <Activity className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-slate-900 leading-tight">RRIE System</h1>
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Intelligent Referral</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg mx-auto">
                            <Activity className="h-5 w-5 text-white" />
                        </div>
                    )}

                </div>

                <div className="h-2" />

                <nav className="flex-1 p-3 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id as View)}
                            className={clsx(
                                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                currentView === item.id
                                    ? "bg-blue-50/80 text-blue-700 shadow-sm border border-blue-100/50"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm hover:border-slate-100 border border-transparent"
                            )}
                        >
                            {currentView === item.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                            )}

                            <item.icon className={clsx("h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110",
                                currentView === item.id ? "text-blue-600" : item.color
                            )} />

                            {isSidebarOpen && (
                                <div className="text-left">
                                    <span className="block text-sm font-semibold">{item.label}</span>
                                    <span className="block text-[10px] text-slate-400 font-medium">{item.subLabel}</span>
                                </div>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100/50">
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors mb-2"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {isSidebarOpen && (
                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">System Online</span>
                            </div>
                            <div className="w-full bg-emerald-100/50 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full w-[98%] animate-pulse" />
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={clsx(
                    "flex-1 transition-all duration-500 ease-in-out flex flex-col min-h-screen relative z-10",
                    isSidebarOpen ? "ml-72" : "ml-20"
                )}
            >
                <header className="h-20 glass sticky top-0 z-20 px-8 flex items-center justify-between border-b border-slate-200/50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                            {navItems.find(n => n.id === currentView)?.label}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Rural Referral Intelligence Engine</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold text-slate-700">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="text-xs text-slate-400 font-mono">{new Date().toLocaleTimeString()}</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm ring-4 ring-white shadow-sm">
                            AD
                        </div>
                    </div>
                </header>

                <div className="p-8 flex-1 overflow-auto">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

