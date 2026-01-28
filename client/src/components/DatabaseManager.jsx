import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Trash2, Users, FileText, AlertTriangle } from 'lucide-react';

const DatabaseManager = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            if (activeTab === 'users') {
                const { data } = await api.get('/auth/users');
                setUsers(data);
            } else {
                const { data } = await api.get('/pdfs');
                setPdfs(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setMessage({ type: 'error', text: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure? This action cannot be undone.')) return;

        try {
            await api.delete(`/auth/users/${id}`);
            setUsers(users.filter(user => user._id !== id));
            setMessage({ type: 'success', text: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            setMessage({ type: 'error', text: 'Failed to delete user' });
        }
    };

    const handleDeletePdf = async (id) => {
        if (!window.confirm('Are you sure? This will delete the file permanently.')) return;

        try {
            await api.delete(`/pdfs/${id}`);
            setPdfs(pdfs.filter(pdf => pdf._id !== id));
            setMessage({ type: 'success', text: 'PDF deleted successfully' });
        } catch (error) {
            console.error('Error deleting PDF:', error);
            setMessage({ type: 'error', text: 'Failed to delete PDF' });
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Database Manager</h1>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'users'
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Users className="w-5 h-5" />
                    Users
                </button>
                <button
                    onClick={() => setActiveTab('pdfs')}
                    className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === 'pdfs'
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <FileText className="w-5 h-5" />
                    PDFs
                </button>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`mb-6 p-4 rounded-md flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message.type === 'success' ? <div className="w-2 h-2 rounded-full bg-green-500" /> : <AlertTriangle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading data...</div>
            ) : activeTab === 'users' ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDeleteUser(user._id)}
                                            className="text-red-600 hover:text-red-900 flex items-center gap-1 ml-auto"
                                            disabled={user.role === 'admin' && user.email === 'admin@gmail.com'} // Prevent deleting main admin
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded By</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pdfs.map((pdf) => (
                                <tr key={pdf._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 break-words max-w-xs">{pdf.title}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 break-words max-w-xs">{pdf.filename}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(pdf.size / 1024 / 1024).toFixed(2)} MB
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {pdf.uploadedBy?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDeletePdf(pdf._id)}
                                            className="text-red-600 hover:text-red-900 flex items-center gap-1 ml-auto"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DatabaseManager;
