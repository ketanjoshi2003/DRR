import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Upload, BarChart, FileText, Users, Clock, AlertCircle, CheckCircle, Search, GraduationCap, BookOpen, Trash2, RotateCcw } from 'lucide-react';

import BulkUpload from './BulkUpload';

const AdminDashboard = ({ tab = 'upload' }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState([]);
    const [userStats, setUserStats] = useState([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [selectedPdfId, setSelectedPdfId] = useState(null);
    const [fileSearch, setFileSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [overviewStats, setOverviewStats] = useState({ users: 0, courses: 0, subjects: 0, pdfs: 0 });
    const [activeModal, setActiveModal] = useState(null); // 'users' or 'pdfs' or null
    const [manageData, setManageData] = useState([]); // List of users or pdfs for management table
    const [loadingManage, setLoadingManage] = useState(false);

    useEffect(() => {
        if (tab === 'analytics') {
            fetchStats();
        }
    }, [tab]);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const { data } = await api.get('/analytics/stats');
            const { data: userData } = await api.get('/analytics/user-stats');
            const { data: overviewData } = await api.get('/analytics/overview');
            setStats(data);
            setUserStats(userData);
            setOverviewStats(overviewData);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleManageClick = async (type) => {
        setActiveModal(type);
        setLoadingManage(true);
        setManageData([]);
        try {
            const endpoint = type === 'users' ? '/auth/users' : '/pdfs';
            const { data } = await api.get(endpoint);
            setManageData(data);
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            setMessage({ type: 'error', text: `Failed to load ${type}` });
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
        if (!window.confirm('Are you sure you want to PERMANENTLY delete all reading analytics and session history? This cannot be undone.')) {
            return;
        }

        try {
            await api.delete('/analytics/reset');
            // Refresh counts and lists
            fetchStats();
            alert('Analytics data has been reset.');
        } catch (error) {
            console.error('Reset analytics error:', error);
            const message = error.response?.data?.message || error.message || 'Failed to reset analytics';
            alert(message);
        }
    };



    return (
        <div>


            {tab === 'upload' ? (
                <div className="max-w-4xl">
                    <BulkUpload />
                </div>
            ) : (
                <div>
                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                            className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:shadow-md dark:hover:shadow-indigo-500/10 transition-all group"
                        >

                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Active Courses</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{overviewStats.courses}</p>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                                <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                        <div
                            onClick={() => navigate('/subjects')}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:shadow-md dark:hover:shadow-indigo-500/10 transition-all group"
                        >

                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Total Subjects</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{overviewStats.subjects}</p>
                            </div>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                                <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                        <div
                            onClick={() => handleManageClick('pdfs')}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md dark:hover:shadow-brand-500/10 transition-all group"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">PDF Documents</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{overviewStats.pdfs}</p>
                            </div>
                            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg group-hover:bg-brand-100 dark:group-hover:bg-brand-900/40 transition-colors">
                                <FileText className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                        </div>
                    </div>

                    {/* Management Modal */}
                    {activeModal && (
                        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setActiveModal(null)}></div>
                                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                                <div className="inline-block align-bottom bg-white dark:bg-zinc-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border dark:border-zinc-800">
                                    <div className="bg-white dark:bg-zinc-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <div className="sm:flex sm:items-start pl-0">
                                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">
                                                    Manage {activeModal === 'users' ? 'Users' : 'PDFs'}
                                                </h3>
                                                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                                                    {loadingManage ? (
                                                        <div className="text-center py-4 text-gray-500">Loading...</div>
                                                    ) : (
                                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                                            <thead className="bg-gray-50 dark:bg-zinc-950">
                                                                <tr>
                                                                    {activeModal === 'users' ? (
                                                                        <>
                                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title/Author</th>
                                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
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
                                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                                                                        }`}>
                                                                                        {item.role}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                                    <button onClick={() => handleDeleteItem(item._id, 'users')} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </td>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                                                                                    <div className="truncate" title={item.title}>{item.title}</div>
                                                                                    {item.metadata?.author && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">by {item.metadata.author}</div>}
                                                                                </td>
                                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                    <div className="flex flex-col gap-1">
                                                                                        <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                                                                                        <div className="flex gap-1">
                                                                                            {item.numPages > 0 && <span className="bg-gray-100 dark:bg-zinc-800 px-1.5 rounded text-xs">{item.numPages}p</span>}
                                                                                            {item.isSearchable && <span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 px-1.5 rounded text-xs">{item.ocrText ? 'OCR' : 'Text'}</span>}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                                    <button onClick={() => handleDeleteItem(item._id, 'pdfs')} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-zinc-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t dark:border-zinc-700">
                                        <button
                                            type="button"
                                            className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-zinc-700 shadow-sm px-4 py-2 bg-white dark:bg-zinc-900 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                                            onClick={() => setActiveModal(null)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Reading Analytics</h2>
                        <button
                            onClick={handleResetAnalytics}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset Analytics
                        </button>
                    </div>
                    {loadingStats ? (
                        <div>Loading stats...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <div className="flex items-center justify-between h-8 mb-4">
                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">File Performance</h3>
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

                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Click a title to filter user activity</p>
                                <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                        <thead className="bg-gray-50 dark:bg-zinc-950">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PDF Title</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sessions</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Readers</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                                            {stats
                                                .filter(stat => stat.title.toLowerCase().includes(fileSearch.toLowerCase()))
                                                .map((stat) => (
                                                    <tr
                                                        key={stat._id}
                                                        className={`hover:bg-gray-50 dark:hover:bg-zinc-950 cursor-pointer transition-colors ${selectedPdfId === stat._id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
                                                        onClick={() => setSelectedPdfId(selectedPdfId === stat._id ? null : stat._id)}
                                                    >
                                                        <td className={`px-6 py-4 text-sm font-medium break-words max-w-xs ${selectedPdfId === stat._id ? 'text-brand-700 dark:text-brand-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                            {stat.title}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{stat.totalSessions}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{stat.uniqueUsersCount}</td>
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

                            <div>
                                <div className="flex items-center h-8 mb-4">
                                    <h3 className="text-lg font-semibold text-gray-700">
                                        User Activity {selectedPdfId ? '(Filtered)' : '(All)'}
                                    </h3>
                                    {selectedPdfId && (
                                        <button
                                            onClick={() => setSelectedPdfId(null)}
                                            className="ml-2 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 font-normal"
                                        >
                                            Clear Filter
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
                                <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                                        <thead className="bg-gray-50 dark:bg-zinc-950">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">File</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Opens</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                                            {userStats
                                                .filter(stat => !selectedPdfId || stat.pdfId === selectedPdfId)
                                                .filter(stat =>
                                                    stat.userName.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                    stat.userEmail.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                    stat.pdfTitle.toLowerCase().includes(userSearch.toLowerCase())
                                                )
                                                .map((stat, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-950 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 break-words max-w-[150px]">
                                                            {stat.userName}
                                                            <div className="text-xs text-gray-400 dark:text-gray-500 break-words">{stat.userEmail}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 break-words max-w-[150px]">{stat.pdfTitle}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {(stat.totalDuration / 60).toFixed(1)}m
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{stat.totalSessions}</td>
                                                    </tr>
                                                ))}
                                            {userStats.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No activity recorded</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
