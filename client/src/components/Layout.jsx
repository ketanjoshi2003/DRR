import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, Upload, BarChart, Book, GraduationCap, Calendar, LayoutGrid, Menu, X, Moon, Sun } from 'lucide-react';

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
        { to: "/subjects", icon: Book, label: "Subjects" }
    ];

    const adminItems = [
        { to: "/semesters", icon: Calendar, label: "Semesters" },
        { to: "/upload", icon: Upload, label: "Upload" },
        { to: "/analytics", icon: BarChart, label: "Analytics" }
    ];

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 transition-colors duration-150">
            <div>
                <div className={`p-4 flex items-center ${isCollapsed && !isMobileOpen ? 'justify-center' : 'px-6'}`}>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`hidden md:block p-2 bg-brand-50 dark:bg-zinc-900 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-zinc-800 transition-colors border border-brand-100 dark:border-zinc-800`}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <BookOpen className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="mt-2 px-3 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                                flex items-center px-3 py-3 rounded-lg group transition-all duration-200
                                ${isActive
                                    ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 font-medium border-l-4 border-brand-600'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-brand-600 dark:hover:text-brand-400 border-l-4 border-transparent'
                                }
                                ${(isCollapsed && !isMobileOpen) ? 'justify-center px-0' : ''}
                            `}
                            title={(isCollapsed && !isMobileOpen) ? item.label : ''}
                        >
                            <item.icon className={`w-5 h-5 shrink-0 ${!isCollapsed || isMobileOpen ? 'mr-3' : ''}`} />
                            {(!isCollapsed || isMobileOpen) && <span>{item.label}</span>}
                        </NavLink>
                    ))}

                    {user?.role === 'admin' && (
                        <>
                            <div className={`pt-4 pb-2 ${(isCollapsed && !isMobileOpen) ? 'text-center' : 'px-4'}`}>
                                <p className={`text-xs font-semibold text-gray-400 uppercase tracking-wider ${(isCollapsed && !isMobileOpen) ? 'text-[10px]' : ''}`}>
                                    {(isCollapsed && !isMobileOpen) ? 'ADM' : 'Admin'}
                                </p>
                            </div>
                            {adminItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) => `
                                        flex items-center px-3 py-3 rounded-lg group transition-all duration-200
                                        ${isActive
                                            ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 font-medium border-l-4 border-brand-600'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-brand-600 dark:hover:text-brand-400 border-l-4 border-transparent'
                                        }
                                        ${(isCollapsed && !isMobileOpen) ? 'justify-center px-0' : ''}
                                    `}
                                    title={(isCollapsed && !isMobileOpen) ? item.label : ''}
                                >
                                    <item.icon className={`w-5 h-5 shrink-0 ${!isCollapsed || isMobileOpen ? 'mr-3' : ''}`} />
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
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
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
                            <p className="text-xs text-brand-500 dark:text-brand-400 truncate font-medium">{user?.role}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all font-medium group ${(isCollapsed && !isMobileOpen) ? 'justify-center px-0' : ''}`}
                    title={(isCollapsed && !isMobileOpen) ? "Sign Out" : ''}
                >
                    <LogOut className={`w-4 h-4 group-hover:rotate-12 transition-transform shrink-0 ${!isCollapsed || isMobileOpen ? 'mr-2' : ''}`} />
                    {(!isCollapsed || isMobileOpen) && "Sign Out"}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-black flex font-sans overflow-hidden transition-colors duration-150">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 z-30 px-4 py-3 flex items-center justify-between transition-colors duration-150">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    {/* Title removed */}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-lg"
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-700 dark:text-brand-400 font-bold text-sm border border-brand-200 dark:border-brand-800">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <aside
                className={`
                    fixed inset-y-0 left-0 bg-white dark:bg-zinc-950 z-50 w-64 shadow-xl transform transition-transform duration-150 ease-in-out md:hidden
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <SidebarContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={`
                    hidden md:flex flex-col bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 h-screen sticky top-0 z-20 transition-all duration-150 ease-in-out shrink-0
                    ${isCollapsed ? 'w-20' : 'w-64'}
                `}
            >
                <SidebarContent />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto w-full transition-all duration-150 pt-16 md:pt-4">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div key={location.pathname} className="animate-fade-in">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
