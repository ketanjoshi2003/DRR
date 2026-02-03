import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, Upload, BarChart, Book, GraduationCap, Calendar, LayoutGrid, Menu, X, Moon, Sun, Bookmark, ChevronRight } from 'lucide-react';

const Layout = () => {
    const { user, logout, isDarkMode, toggleTheme } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Close mobile sidebar on route change

    // Close mobile sidebar on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: "/", icon: LayoutGrid, label: "Library" },
        { to: "/courses", icon: GraduationCap, label: "Courses" },
        { to: "/subjects", icon: Book, label: "Subjects" },
        ...(user?.role === 'admin' ? [{ to: "/semesters", icon: Calendar, label: "Semesters" }] : []),
        { to: "/collection", icon: Bookmark, label: "My Collection" }
    ];

    const adminItems = [
        { to: "/upload", icon: Upload, label: "Upload" },
        { to: "/analytics", icon: BarChart, label: "Analytics" }
    ];

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 transition-colors duration-150">
            <div className="flex-1 overflow-y-auto pt-4">
                <div className={`mb-6 flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'px-6'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-600 rounded-lg shadow-lg shadow-brand-500/20">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        {(!isCollapsed || isMobileOpen) && (
                            <span className="text-xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                                DRR
                            </span>
                        )}
                    </div>
                </div>

                <nav className="px-3 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                                flex items-center px-3 py-2.5 rounded-xl group transition-all duration-200
                                ${isActive
                                    ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 font-semibold'
                                    : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-900/50 hover:text-brand-600 dark:hover:text-brand-400'
                                }
                                ${(isCollapsed && !isMobileOpen) ? 'justify-center px-0' : ''}
                            `}
                        >
                            <item.icon className={`w-5 h-5 shrink-0 ${!isCollapsed || isMobileOpen ? 'mr-3' : ''} ${isCollapsed && !isMobileOpen ? '' : 'transition-transform group-hover:scale-110'}`} />
                            {(!isCollapsed || isMobileOpen) && <span>{item.label}</span>}
                            {!isCollapsed && (
                                <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-brand-600 transition-opacity duration-200 ${location.pathname === item.to ? 'opacity-100' : 'opacity-0'}`} />
                            )}
                        </NavLink>
                    ))}

                    {user?.role === 'admin' && (
                        <>
                            <div className={`pt-6 pb-2 ${(isCollapsed && !isMobileOpen) ? 'hidden' : 'px-6'}`}>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-[0.2em]">
                                    Admin Tools
                                </p>
                            </div>
                            {adminItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) => `
                                        flex items-center px-3 py-2.5 rounded-xl group transition-all duration-200
                                        ${isActive
                                            ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 font-semibold'
                                            : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-900/50 hover:text-brand-600 dark:hover:text-brand-400'
                                        }
                                        ${(isCollapsed && !isMobileOpen) ? 'justify-center px-0' : ''}
                                    `}
                                >
                                    <item.icon className={`w-5 h-5 shrink-0 ${!isCollapsed || isMobileOpen ? 'mr-3' : ''} ${isCollapsed && !isMobileOpen ? '' : 'transition-transform group-hover:scale-110'}`} />
                                    {(!isCollapsed || isMobileOpen) && <span>{item.label}</span>}
                                </NavLink>
                            ))}
                        </>
                    )}
                </nav>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 mt-auto transition-colors duration-150">
                <button
                    onClick={toggleTheme}
                    className={`
                        w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 
                        hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg transition-all mb-4 font-medium
                        ${(isCollapsed && !isMobileOpen) ? 'justify-center px-0' : ''}
                    `}
                >
                    {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                    {(!isCollapsed || isMobileOpen) && <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>}
                </button>

                <div className={`flex items-center gap-3 mb-4 rounded-lg p-2 ${!isCollapsed || isMobileOpen ? 'hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer' : 'justify-center'}`}>
                    <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold border border-brand-200 dark:border-brand-800 shrink-0">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    {(!isCollapsed || isMobileOpen) && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user?.name}</p>
                            <p className="text-[10px] text-brand-500 dark:text-brand-400 truncate font-bold uppercase tracking-wider">{user?.role}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all font-medium group ${(isCollapsed && !isMobileOpen) ? 'justify-center px-0' : ''}`}
                >
                    <LogOut className={`w-4 h-4 group-hover:rotate-12 transition-transform shrink-0 ${!isCollapsed || isMobileOpen ? 'mr-3' : ''}`} />
                    {(!isCollapsed || isMobileOpen) && "Sign Out"}
                </button>
            </div>
        </div>
    );

    return (
        <div className="h-screen bg-white dark:bg-black flex font-sans overflow-hidden transition-colors duration-150">
            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200/50 dark:border-zinc-800/50 z-30 px-4 flex items-center justify-between transition-colors duration-150">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-brand-600 rounded-lg shadow-lg shadow-brand-500/20">
                        <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent tracking-tight">
                        DRR
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-xl transition-colors"
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-xs border border-brand-200 dark:border-brand-800">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </header>

            {/* Desktop Sidebar */}
            <aside
                className={`
                    hidden md:flex flex-col bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 h-screen sticky top-0 z-20 transition-all duration-150 ease-in-out shrink-0
                    ${isCollapsed ? 'w-20' : 'w-64'}
                `}
            >
                <div className="absolute top-4 -right-3 z-30 hidden md:block">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full text-gray-400 hover:text-brand-600 shadow-sm"
                    >
                        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
                    </button>
                </div>
                <SidebarContent />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto w-full transition-all duration-150 pt-14 pb-20 md:pt-0 md:pb-0">
                <div className="px-4 pt-3 pb-6 md:px-6 md:pt-4 md:pb-8 max-w-7xl mx-auto">
                    <div key={location.pathname} className="animate-fade-in">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation - SLEEK & MODERN */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-zinc-800/50 px-2 pb-safe-area-inset-bottom">
                <div className="flex items-center justify-around h-16">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.to;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={`
                                    flex flex-col items-center justify-center w-16 h-12 rounded-2xl transition-all duration-300
                                    ${isActive
                                        ? 'text-brand-600 dark:text-brand-400'
                                        : 'text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400'
                                    }
                                `}
                            >
                                <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                                <span className={`text-[10px] mt-1 font-bold ${isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-95'}`}>
                                    {item.label === 'My Collection' ? 'Saved' : item.label}
                                </span>
                            </NavLink>
                        );
                    })}
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className={`
                                flex flex-col items-center justify-center w-16 h-12 rounded-2xl transition-all
                                ${isMobileOpen ? 'text-brand-600' : 'text-gray-400'}
                            `}
                        >
                            <Menu className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-bold opacity-60">More</span>
                        </button>
                    )}
                </div>
            </nav>

            {/* Mobile Admin Drawer (triggered from "More") */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMobileOpen(false)}
                >
                    <div
                        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 rounded-t-[32px] p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto mb-6" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Admin Controls</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {adminItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setIsMobileOpen(false)}
                                    className="flex flex-col items-center p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:border-brand-500/50 transition-all"
                                >
                                    <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl mb-2 text-brand-600 dark:text-brand-400">
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.label}</span>
                                </NavLink>
                            ))}
                            <button
                                onClick={handleLogout}
                                className="flex flex-col items-center p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 col-span-2 mt-2"
                            >
                                <LogOut className="w-6 h-6 text-red-600 mb-2" />
                                <span className="text-sm font-bold text-red-600">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
