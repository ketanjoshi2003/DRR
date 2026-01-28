import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, Upload, BarChart, Book, GraduationCap, Calendar, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-brand-50/30 flex font-sans overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`${isCollapsed ? 'w-20' : 'w-56'} bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col justify-between z-20 transition-all duration-300 ease-in-out shrink-0`}
            >
                <div>
                    <div className={`p-4 flex ${isCollapsed ? 'justify-center' : 'px-6'}`}>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 bg-brand-50 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors border border-brand-100"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <BookOpen className="w-6 h-6" />
                        </button>
                    </div>

                    <nav className="mt-2 px-3 space-y-1">
                        {[
                            { to: "/", icon: LayoutGrid, label: "Library" },
                            { to: "/courses", icon: GraduationCap, label: "Courses" },
                            { to: "/subjects", icon: Book, label: "Subjects" },
                            { to: "/semesters", icon: Calendar, label: "Semesters" }
                        ].map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={`
                                    flex items-center px-3 py-3 group
                                    ${isCollapsed ? 'justify-center' : ''}
                                `}
                                title={isCollapsed ? item.label : ''}
                            >
                                {({ isActive }) => (
                                    <div className={`
                                        flex items-center gap-3 transition-all duration-200 font-medium border-b-2 pb-1
                                        ${isActive ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-600 group-hover:border-gray-300 group-hover:text-brand-600'}
                                    `}>
                                        <item.icon className="w-5 h-5 shrink-0" />
                                        {!isCollapsed && <span>{item.label}</span>}
                                    </div>
                                )}
                            </NavLink>
                        ))}

                        {user?.role === 'admin' && (
                            <>
                                <div className={`pt-4 pb-2 ${isCollapsed ? 'text-center' : ''}`}>
                                    <p className={`px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider ${isCollapsed ? 'text-[10px] px-1' : ''}`}>
                                        {isCollapsed ? 'ADM' : 'Admin'}
                                    </p>
                                </div>
                                {[
                                    { to: "/upload", icon: Upload, label: "Upload" },
                                    { to: "/analytics", icon: BarChart, label: "Analytics" }
                                ].map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={`
                                            flex items-center px-3 py-3 group
                                            ${isCollapsed ? 'justify-center' : ''}
                                        `}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        {({ isActive }) => (
                                            <div className={`
                                                flex items-center gap-3 transition-all duration-200 font-medium border-b-2 pb-1
                                                ${isActive ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-600 group-hover:border-gray-300 group-hover:text-brand-600'}
                                            `}>
                                                <item.icon className="w-5 h-5 shrink-0" />
                                                {!isCollapsed && <span>{item.label}</span>}
                                            </div>
                                        )}
                                    </NavLink>
                                ))}
                            </>
                        )}
                    </nav>
                </div>

                <div className="p-4 border-t border-gray-100 bg-white">
                    <div className={`flex items-center gap-3 mb-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${isCollapsed ? 'justify-center p-0' : 'px-2 p-2'}`}>
                        <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold border border-brand-100 shrink-0">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                                <p className="text-xs text-brand-500 truncate font-medium">{user?.role}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium group ${isCollapsed ? 'justify-center px-0' : ''}`}
                        title={isCollapsed ? "Sign Out" : ''}
                    >
                        <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform shrink-0" />
                        {!isCollapsed && "Sign Out"}
                    </button>
                </div>
            </aside >

            {/* Main Content */}
            < main className="flex-1 overflow-auto transition-all duration-300" >
                <div className="p-8 max-w-7xl mx-auto">
                    <div key={location.pathname} className="animate-fade-in">
                        <Outlet />
                    </div>
                </div>
            </main >
        </div >
    );
};

export default Layout;
