import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Upload, BarChart, FileText, Users, Clock, AlertCircle, CheckCircle, Search } from 'lucide-react';

const AdminDashboard = ({ tab = 'upload' }) => {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [stats, setStats] = useState([]);
    const [userStats, setUserStats] = useState([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [selectedPdfId, setSelectedPdfId] = useState(null);
    const [fileSearch, setFileSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

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
            setStats(data);
            setUserStats(userData);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setMessage({ type: 'error', text: 'Please select a file' });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title || file.name);

        setUploading(true);
        setMessage({ type: '', text: '' });

        try {
            await api.post('/pdfs/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage({ type: 'success', text: 'PDF uploaded successfully' });
            setFile(null);
            setTitle('');
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Upload failed' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <div className="border-b border-gray-200 mb-8">
                {/* ... navigation ... */}
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => navigate('/upload')}
                        className={`${tab === 'upload'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <Upload className="w-4 h-4" />
                        Upload PDF
                    </button>
                    <button
                        onClick={() => navigate('/analytics')}
                        className={`${tab === 'analytics'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <BarChart className="w-4 h-4" />
                        Analytics
                    </button>
                </nav>
            </div>

            {tab === 'upload' ? (
                <div className="max-w-xl">
                    {/* ... upload form ... */}
                    <h2 className="text-xl font-bold mb-6">Upload New PDF</h2>
                    <form onSubmit={handleUpload} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        {message.text && (
                            <div className={`p-4 rounded-md flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                {message.text}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">PDF Title (Optional)</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border"
                                placeholder="Enter custom title"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">PDF File</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
                                <div className="space-y-1 text-center">
                                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">PDF up to 50MB</p>
                                    {file && <p className="text-sm font-bold text-gray-700 mt-2">{file.name}</p>}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={uploading}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? 'Uploading...' : 'Upload PDF'}
                        </button>
                    </form>
                </div>
            ) : (
                <div>
                    <h2 className="text-xl font-bold mb-6">Reading Analytics</h2>
                    {loadingStats ? (
                        <div>Loading stats...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-semibold mb-4 text-gray-700">File Performance</h3>

                                <div className="mb-4 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search files..."
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={fileSearch}
                                        onChange={(e) => setFileSearch(e.target.value)}
                                    />
                                </div>

                                <p className="text-xs text-gray-500 mb-2">Click a title to filter user activity</p>
                                <div className="overflow-x-auto bg-white rounded-lg shadow">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF Title</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Readers</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {stats
                                                .filter(stat => stat.title.toLowerCase().includes(fileSearch.toLowerCase()))
                                                .map((stat) => (
                                                    <tr
                                                        key={stat._id}
                                                        className={`hover:bg-gray-50 cursor-pointer ${selectedPdfId === stat._id ? 'bg-blue-50' : ''}`}
                                                        onClick={() => setSelectedPdfId(selectedPdfId === stat._id ? null : stat._id)}
                                                    >
                                                        <td className={`px-6 py-4 text-sm font-medium break-words max-w-xs ${selectedPdfId === stat._id ? 'text-blue-700' : 'text-gray-900'}`}>
                                                            {stat.title}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.totalSessions}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.uniqueUsersCount}</td>
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
                                <h3 className="text-lg font-semibold mb-4 text-gray-700">
                                    User Activity {selectedPdfId ? '(Filtered)' : '(All)'}
                                    {selectedPdfId && (
                                        <button
                                            onClick={() => setSelectedPdfId(null)}
                                            className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-normal"
                                        >
                                            Clear Filter
                                        </button>
                                    )}
                                </h3>

                                <div className="mb-4 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search user or file..."
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                </div>
                                <div className="overflow-x-auto bg-white rounded-lg shadow">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opens</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {userStats
                                                .filter(stat => !selectedPdfId || stat.pdfId === selectedPdfId)
                                                .filter(stat =>
                                                    stat.userName.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                    stat.userEmail.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                    stat.pdfTitle.toLowerCase().includes(userSearch.toLowerCase())
                                                )
                                                .map((stat, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 break-words max-w-[150px]">
                                                            {stat.userName}
                                                            <div className="text-xs text-gray-400 break-words">{stat.userEmail}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-500 break-words max-w-[150px]">{stat.pdfTitle}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {(stat.totalDuration / 60).toFixed(1)}m
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.totalSessions}</td>
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
