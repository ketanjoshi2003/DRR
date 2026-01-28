import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, Upload, BarChart, Database, Book } from 'lucide-react';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col justify-between z-20">
                <div>
                    <div className="px-6 pt-6 pb-2">
                        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                            <BookOpen className="w-8 h-8" />
                            DRR
                        </h1>
                    </div>
                    <nav className="mt-2">
                        <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 transition-colors ${isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'}`}>
                            <BookOpen className="w-5 h-5" />
                            Library
                        </NavLink>
                        <NavLink to="/courses" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 transition-colors ${isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'}`}>
                            <BookOpen className="w-5 h-5" />
                            Courses
                        </NavLink>
                        <NavLink to="/subjects" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 transition-colors ${isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'}`}>
                            <Book className="w-5 h-5" />
                            Subjects
                        </NavLink>
                        <NavLink to="/semesters" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 transition-colors ${isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'}`}>
                            <Book className="w-5 h-5" />
                            Semesters
                        </NavLink>
                        {user?.role === 'admin' && (
                            <>
                                <NavLink to="/upload" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 transition-colors ${isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'}`}>
                                    <Upload className="w-5 h-5" />
                                    Upload PDF
                                </NavLink>
                                <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 transition-colors ${isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'}`}>
                                    <BarChart className="w-5 h-5" />
                                    Analytics
                                </NavLink>
                                <NavLink to="/database" className={({ isActive }) => `flex items-center gap-3 px-6 py-3 transition-colors ${isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'}`}>
                                    <Database className="w-5 h-5" />
                                    Database
                                </NavLink>
                            </>
                        )}
                    </nav>
                </div>

                <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
