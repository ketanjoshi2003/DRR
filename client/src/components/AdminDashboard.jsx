import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Upload, BarChart, FileText, Users, Clock, AlertCircle, CheckCircle, Search, GraduationCap, BookOpen, Trash2, RotateCcw, X, ChevronDown, ChevronUp, Eye, User, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BulkUpload from './BulkUpload';

const AdminDashboard = ({ tab = 'upload' }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState([]);
    const [userStats, setUserStats] = useState([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [selectedPdfId, setSelectedPdfId] = useState(null);
    const [selectedUserEmail, setSelectedUserEmail] = useState(null);
    const [fileSearch, setFileSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [overviewStats, setOverviewStats] = useState({ users: 0, courses: 0, subjects: 0, pdfs: 0 });
    const [activeModal, setActiveModal] = useState(null); // 'users' or 'pdfs' or null
    const [manageData, setManageData] = useState([]); // List of users or pdfs for management table
    const [loadingManage, setLoadingManage] = useState(false);

    // Notes analytics state
    const [notesData, setNotesData] = useState([]);

    // Teacher analytics state
    const [teacherStats, setTeacherStats] = useState([]);
    const [loadingTeacherStats, setLoadingTeacherStats] = useState(false);
    const [expandedTeacher, setExpandedTeacher] = useState(null);
    const [expandedMaterial, setExpandedMaterial] = useState(null);
    const [teacherSearch, setTeacherSearch] = useState('');
    const [analyticsView, setAnalyticsView] = useState('students');
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        if (tab === 'analytics') {
            fetchStats();
            if (user?.role === 'admin') {
                fetchTeacherStats();
            }
        }
    }, [tab]);

    const fetchTeacherStats = async () => {
        setLoadingTeacherStats(true);
        try {
            const { data } = await api.get('/analytics/teacher-stats');
            setTeacherStats(data);
        } catch (error) {
            console.error('Error fetching teacher stats:', error);
        } finally {
            setLoadingTeacherStats(false);
        }
    };

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const { data } = await api.get('/analytics/stats');
            const { data: userData } = await api.get('/analytics/user-stats');
            const { data: overviewData } = await api.get('/analytics/overview');
            const { data: notesResp } = await api.get('/analytics/notes');
            setStats(data);
            setUserStats(userData);
            setOverviewStats(overviewData);
            setNotesData(notesResp);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleManageClick = async (type) => {
        if (activeModal === type) {
            setActiveModal(null);
            return;
        }

        setActiveModal(type);
        setLoadingManage(true);
        setManageData([]);
        try {
            const endpoint = type === 'users' ? '/auth/users' : '/pdfs';
            const { data } = await api.get(endpoint);
            setManageData(data);
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            // setMessage({ type: 'error', text: `Failed to load ${type}` });
        } finally {
            setLoadingManage(false);
        }
    };

    const handleDeleteItem = async (id, type) => {
        const confirmMsg = type === 'users'
            ? 'Are you sure you want to delete this user? This action cannot be undone.'
            : 'Are you sure? This will delete the file permanently.';

        if (!window.confirm(confirmMsg)) return;

        try {
            const endpoint = type === 'users' ? `/auth/users/${id}` : `/pdfs/${id}`;
            await api.delete(endpoint);
            setManageData(prev => prev.filter(item => item._id !== id));
            // Refresh stats to keep counts accurate
            fetchStats();
            alert(`${type === 'users' ? 'User' : 'PDF'} deleted successfully`);
        } catch (error) {
            console.error('Delete error:', error);
            alert('Delete failed');
        }
    };

    const handleResetAnalytics = async () => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete all reading analytics, session history, and user notes? This cannot be undone.')) {
            return;
        }

        try {
            const { data } = await api.delete('/analytics/reset');
            // Refresh counts and lists
            fetchStats();
            const deletedSessions = data?.deleted?.sessions ?? 0;
            const deletedNotes = data?.deleted?.notes ?? 0;
            alert(`Reset complete. Deleted ${deletedSessions} sessions and ${deletedNotes} notes.`);
        } catch (error) {
            console.error('Reset analytics error:', error);
            const message = error.response?.data?.message || error.message || 'Failed to reset analytics';
            alert(message);
        }
    };


    // --- Report generation helpers ---
    const generateStudentPdfReport = async () => {
        setGeneratingPdf(true);
        try {
            const response = await api.get('/reports/student-pdf', { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `student-analytics-report-${new Date().toISOString().slice(0, 10)}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF report');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const generateTeacherPdfReport = async () => {
        setGeneratingPdf(true);
        try {
            const response = await api.get('/reports/teacher-pdf', { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `teacher-analytics-report-${new Date().toISOString().slice(0, 10)}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF report');
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <div>


            {tab === 'upload' && (
                <div className="max-w-4xl">
                    <div className="mb-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Simple Upload Flow</p>
                        <p className="text-sm text-gray-700 dark:text-zinc-300 mt-1">
                            Use one screen for everything: select files, optionally add a Master CSV for filename mapping and hierarchy updates, then upload.
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">
                            Tip: use minimal template server/master-upload-minimal-template.csv (filename + subjectCode).
                        </p>
                    </div>

                    <div className="mb-6 rounded-xl border border-brand-100 dark:border-brand-900/20 bg-brand-50/50 dark:bg-brand-900/10 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">3 Steps</p>
                        <ol className="mt-2 text-sm text-brand-800 dark:text-brand-200 space-y-1 list-decimal pl-5">
                            <li>Select all document files (PDF, DOC, image, audio, video).</li>
                            <li>Optional: add one Master CSV with filename column.</li>
                            <li>Click upload and review auto-mapped results.</li>
                        </ol>
                    </div>

                    <BulkUpload />
                </div>
            )}

            {tab === 'analytics' && (
                <div className="pt-2">
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                            Analytics Dashboard
                        </h1>
                        {user?.role === 'admin' && (
                            <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
                                <button
                                    onClick={() => setAnalyticsView('students')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${analyticsView === 'students'
                                        ? 'bg-white dark:bg-zinc-900 text-brand-700 dark:text-brand-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Student Analytics
                                </button>
                                <button
                                    onClick={() => setAnalyticsView('teachers')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${analyticsView === 'teachers'
                                        ? 'bg-white dark:bg-zinc-900 text-brand-700 dark:text-brand-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Teacher Analytics
                                </button>
                            </div>
                        )}
                    </div>
                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div
                            onClick={() => handleManageClick('users')}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md dark:hover:shadow-blue-500/10 transition-all group"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Total Users</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{overviewStats.users}</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div
                            onClick={() => navigate('/courses')}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:shadow-md dark:hover:shadow-blue-500/10 transition-all group"
                        >

                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Active Courses</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{overviewStats.courses}</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div
                            onClick={() => navigate('/subjects')}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:shadow-md dark:hover:shadow-blue-500/10 transition-all group"
                        >

                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Total Subjects</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{overviewStats.subjects}</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div
                            onClick={() => handleManageClick('pdfs')}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md dark:hover:shadow-blue-500/10 transition-all group"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">PDF Documents</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{overviewStats.pdfs}</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>

                    {/* Inline Management Section */}
                    {activeModal && (
                        <div className="mb-8 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    {activeModal === 'users' ? <Users className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-brand-500" />}
                                    Manage {activeModal === 'users' ? 'Users' : 'PDFs'}
                                </h3>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-0">
                                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                    {loadingManage ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-2"></div>
                                            <p>Loading data...</p>
                                        </div>
                                    ) : (
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800 text-left">
                                            <thead className="bg-gray-50 dark:bg-zinc-950 sticky top-0 z-10">
                                                <tr>
                                                    {activeModal === 'users' ? (
                                                        <>
                                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title/Author</th>
                                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                                                {manageData.map((item) => (
                                                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-zinc-950 transition-colors">
                                                        {activeModal === 'users' ? (
                                                            <>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.email}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${item.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : item.role === 'teacher' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                                        }`}>
                                                                        {item.role}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <button onClick={() => handleDeleteItem(item._id, 'users')} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                    <div className="flex flex-col max-w-xs">
                                                                        <span className="truncate font-bold" title={item.title}>{item.title}</span>
                                                                        {item.metadata?.author && <span className="text-xs text-gray-500 dark:text-gray-400 truncate">by {item.metadata.author}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs font-mono">{(item.size / 1024 / 1024).toFixed(1)} MB</span>
                                                                        {item.numPages > 0 && <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-xs">{item.numPages}p</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <button onClick={() => handleDeleteItem(item._id, 'pdfs')} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                                {manageData.length === 0 && (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-full mb-3">
                                                                    {activeModal === 'users' ? <Users className="w-6 h-6 text-gray-400" /> : <FileText className="w-6 h-6 text-gray-400" />}
                                                                </div>
                                                                <p>No {activeModal === 'users' ? 'users' : 'PDFs'} found</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {analyticsView === 'students' && (<>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Reading Analytics</h2>
                            <div className="flex items-center gap-2">
                                <div>
                                    <button
                                        onClick={generateStudentPdfReport}
                                        disabled={loadingStats || generatingPdf || (stats.length === 0 && userStats.length === 0)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 border border-brand-200 dark:border-brand-900/50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        {generatingPdf ? 'Generating...' : 'Download Report'}
                                    </button>
                                </div>
                                <button
                                    onClick={handleResetAnalytics}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset Analytics
                                </button>
                            </div>
                        </div>
                        {loadingStats ? (
                            <div>Loading stats...</div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: File Performance */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                            File Performance {selectedUserEmail ? '(User Filtered)' : ''}
                                        </h3>
                                        {selectedUserEmail && (
                                            <button
                                                onClick={() => setSelectedUserEmail(null)}
                                                className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-normal"
                                            >
                                                Clear User Filter
                                            </button>
                                        )}
                                    </div>
                                    <div className="mb-4 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search files..."
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-md leading-5 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
                                            value={fileSearch}
                                            onChange={(e) => setFileSearch(e.target.value)}
                                        />
                                    </div>

                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-tight">Click a file to see who read it</p>
                                    <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                            <thead className="bg-gray-50 dark:bg-zinc-950">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PDF Title</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sessions</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                                                {stats
                                                    .filter(stat => {
                                                        // Filter by file search
                                                        if (!stat.title.toLowerCase().includes(fileSearch.toLowerCase())) return false;
                                                        // Filter by selected user if active
                                                        if (selectedUserEmail) {
                                                            return userStats.some(us => us.pdfId === stat._id && us.userEmail === selectedUserEmail);
                                                        }
                                                        return true;
                                                    })
                                                    .map((stat) => (
                                                        <tr
                                                            key={stat._id}
                                                            className={`hover:bg-gray-50 dark:hover:bg-zinc-950 cursor-pointer transition-colors ${selectedPdfId === stat._id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
                                                            onClick={() => setSelectedPdfId(selectedPdfId === stat._id ? null : stat._id)}
                                                        >
                                                            <td className={`px-6 py-4 text-sm font-medium break-words max-w-xs ${selectedPdfId === stat._id ? 'text-brand-700 dark:text-brand-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                                <div className="mb-0.5">{stat.title}</div>
                                                                {(stat.courseCode || stat.subjectCode) && (
                                                                    <div className="flex gap-1 flex-wrap">
                                                                        {stat.courseCode && <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">{stat.courseCode}</span>}
                                                                        {stat.subjectCode && <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">{stat.subjectCode}</span>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{stat.totalSessions}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{(stat.totalDuration / 60).toFixed(1)}m</td>
                                                        </tr>
                                                    ))}
                                                {stats.length === 0 && (
                                                    <tr>
                                                        <td colSpan="3" className="px-6 py-4 text-center text-gray-500">No data</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Right Column: User Activity */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                            User Activity {selectedPdfId ? '(File Filtered)' : ''}
                                        </h3>
                                        {selectedPdfId && (
                                            <button
                                                onClick={() => setSelectedPdfId(null)}
                                                className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-normal"
                                            >
                                                Clear File Filter
                                            </button>
                                        )}
                                    </div>

                                    <div className="mb-4 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search user or file..."
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-md leading-5 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-tight">Click a user to see what they read</p>
                                    <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                            <thead className="bg-gray-50 dark:bg-zinc-950">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">File</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                                                {userStats
                                                    .filter(stat => !selectedPdfId || stat.pdfId === selectedPdfId)
                                                    .filter(stat => !selectedUserEmail || stat.userEmail === selectedUserEmail)
                                                    .filter(stat =>
                                                        stat.userName.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                        stat.userEmail.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                        stat.pdfTitle.toLowerCase().includes(userSearch.toLowerCase())
                                                    )
                                                    .map((stat, idx) => (
                                                        <tr
                                                            key={idx}
                                                            className={`hover:bg-gray-50 dark:hover:bg-zinc-950 transition-colors cursor-pointer ${selectedUserEmail === stat.userEmail ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
                                                            onClick={() => setSelectedUserEmail(selectedUserEmail === stat.userEmail ? null : stat.userEmail)}
                                                        >
                                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 break-words max-w-[150px]">
                                                                <div className={selectedUserEmail === stat.userEmail ? 'text-brand-700 dark:text-brand-400' : ''}>
                                                                    {stat.userName}
                                                                </div>
                                                                <div className="text-xs text-gray-400 dark:text-gray-500 break-words font-normal">{stat.userEmail}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 break-words max-w-[150px]">
                                                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-0.5">{stat.pdfTitle}</div>
                                                                {(stat.courseCode || stat.subjectCode) && (
                                                                    <div className="flex gap-1 flex-wrap mt-1">
                                                                        {stat.courseCode && <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">{stat.courseCode}</span>}
                                                                        {stat.subjectCode && <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">{stat.subjectCode}</span>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                {(stat.totalDuration / 60).toFixed(1)}m
                                                            </td>
                                                        </tr>
                                                    ))}
                                                {userStats.length === 0 && (
                                                    <tr>
                                                        <td colSpan="3" className="px-6 py-4 text-center text-gray-500">No activity recorded</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* User Notes Section (Appended below User Activity) */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">User Notes</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">View highlights and notes made by users in documents</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800 text-left">
                                    <thead className="bg-gray-50 dark:bg-zinc-950">
                                        <tr>
                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Document (Page)</th>
                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Note Content</th>
                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                                        {notesData.map((note) => (
                                            <tr key={note._id} className="hover:bg-gray-50 dark:hover:bg-zinc-950 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 align-top max-w-[150px] break-words">
                                                    <div>{note.user?.name || 'Unknown User'}</div>
                                                    <div className="text-xs text-brand-600 dark:text-brand-400 font-normal">{note.user?.email || 'No email'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate align-top" title={note.pdf?.title || note.pdf?.originalName}>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{note.pdf?.title || note.pdf?.originalName || 'Unknown Document'}</span>
                                                    <div className="text-xs mt-1 bg-gray-100 dark:bg-zinc-800 inline-block px-2 rounded-full border border-gray-200 dark:border-zinc-700">Page {note.pageNumber}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm max-w-md min-w-[300px] align-top">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">{note.noteContent}</div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-zinc-950 p-2 rounded-md border-l-4" style={{ borderLeftColor: note.color || '#ffff00' }}>
                                                        "{note.selectedText}"
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 align-top">
                                                    {new Date(note.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {notesData.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                    No notes recorded yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>)}

                    {analyticsView === 'teachers' && user?.role === 'admin' && (
                        <div>

                            {/* Header with Download */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Teacher Activity</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track teacher uploads, views, and engagement</p>
                                </div>
                                <div>
                                    <button
                                        onClick={generateTeacherPdfReport}
                                        disabled={loadingTeacherStats || generatingPdf || teacherStats.length === 0}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 border border-brand-200 dark:border-brand-900/50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        {generatingPdf ? 'Generating...' : 'Download Report'}
                                    </button>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="mb-6 relative max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search teachers..."
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-xl leading-5 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 sm:text-sm transition-all shadow-sm"
                                    value={teacherSearch}
                                    onChange={(e) => setTeacherSearch(e.target.value)}
                                />
                            </div>

                            {loadingTeacherStats ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-3"></div>
                                    <p>Loading teacher analytics...</p>
                                </div>
                            ) : teacherStats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                                    <div className="p-4 bg-gray-100 dark:bg-zinc-800 rounded-full mb-4">
                                        <Users className="w-8 h-8" />
                                    </div>
                                    <p className="text-lg font-semibold">No teachers found</p>
                                    <p className="text-sm mt-1">Teacher accounts will appear here once registered</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {teacherStats
                                        .filter(t =>
                                            t.teacherName.toLowerCase().includes(teacherSearch.toLowerCase()) ||
                                            t.teacherEmail.toLowerCase().includes(teacherSearch.toLowerCase())
                                        )
                                        .map((teacher) => (
                                            <div key={teacher.teacherId} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all">
                                                {/* Teacher Header */}
                                                <button
                                                    onClick={() => setExpandedTeacher(expandedTeacher === teacher.teacherId ? null : teacher.teacherId)}
                                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-950 transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm border border-amber-200 dark:border-amber-800">
                                                            {teacher.teacherName?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{teacher.teacherName}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{teacher.teacherEmail}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-6">
                                                        <div className="hidden sm:flex items-center gap-6">
                                                            <div className="text-center">
                                                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{teacher.totalUploads}</p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Uploads</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{teacher.totalSessions}</p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Views</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{teacher.uniqueReaders}</p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Readers</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{(teacher.totalDuration / 60).toFixed(0)}m</p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Read Time</p>
                                                            </div>
                                                        </div>
                                                        {expandedTeacher === teacher.teacherId ? (
                                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Mobile Stats Row */}
                                                <div className="sm:hidden flex items-center gap-4 px-6 pb-3 text-xs text-gray-500 dark:text-gray-400">
                                                    <span><strong className="text-gray-800 dark:text-gray-200">{teacher.totalUploads}</strong> uploads</span>
                                                    <span><strong className="text-gray-800 dark:text-gray-200">{teacher.totalSessions}</strong> views</span>
                                                    <span><strong className="text-gray-800 dark:text-gray-200">{teacher.uniqueReaders}</strong> readers</span>
                                                </div>

                                                {/* Expanded Materials */}
                                                {expandedTeacher === teacher.teacherId && (
                                                    <div className="border-t border-gray-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        {teacher.materials.length === 0 ? (
                                                            <div className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                                                                <FileText className="w-6 h-6 mx-auto mb-2" />
                                                                <p className="text-sm">No materials uploaded yet</p>
                                                            </div>
                                                        ) : (
                                                            <div className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                                                {teacher.materials.map((material) => (
                                                                    <div key={material.pdfId}>
                                                                        <button
                                                                            onClick={() => setExpandedMaterial(expandedMaterial === material.pdfId ? null : material.pdfId)}
                                                                            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-zinc-950/50 transition-colors text-left"
                                                                        >
                                                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                                <FileText className="w-4 h-4 text-brand-500 shrink-0" />
                                                                                <div className="min-w-0">
                                                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{material.title}</p>
                                                                                    <div className="flex flex-wrap gap-2 mt-0.5">
                                                                                        {material.courseCode && (
                                                                                            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">{material.courseCode}</span>
                                                                                        )}
                                                                                        {material.subjectCode && (
                                                                                            <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">{material.subjectCode}</span>
                                                                                        )}
                                                                                        <span className="text-[10px] text-gray-400">Uploaded {new Date(material.uploadDate).toLocaleDateString()}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-4 shrink-0 ml-4">
                                                                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                                    <Eye className="w-3.5 h-3.5" />
                                                                                    <span>{material.totalSessions}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                                    <Users className="w-3.5 h-3.5" />
                                                                                    <span>{material.uniqueReaders}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                    <span>{(material.totalDuration / 60).toFixed(0)}m</span>
                                                                                </div>
                                                                                {expandedMaterial === material.pdfId ? (
                                                                                    <ChevronUp className="w-4 h-4 text-gray-300" />
                                                                                ) : (
                                                                                    <ChevronDown className="w-4 h-4 text-gray-300" />
                                                                                )}
                                                                            </div>
                                                                        </button>

                                                                        {/* Recent Sessions */}
                                                                        {expandedMaterial === material.pdfId && material.recentSessions.length > 0 && (
                                                                            <div className="bg-gray-50/50 dark:bg-zinc-950/50 px-6 py-3 border-t border-gray-100 dark:border-zinc-800/50 animate-in fade-in duration-150">
                                                                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Recent Reading Sessions</p>
                                                                                <div className="space-y-2">
                                                                                    {material.recentSessions.map((session, idx) => (
                                                                                        <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg border border-gray-100 dark:border-zinc-800">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                                                                <span className="font-medium text-gray-800 dark:text-gray-200">{session.userName}</span>
                                                                                                <span className="text-gray-400 dark:text-gray-500">{session.userEmail}</span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                                                                                                <span>{new Date(session.startTime).toLocaleString()}</span>
                                                                                                <span className="font-medium">{(session.duration / 60).toFixed(1)}m</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
