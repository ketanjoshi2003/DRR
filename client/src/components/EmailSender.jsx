import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Send, Users, User, ShieldCheck, AlignLeft, CheckCircle, XCircle, Search, FileText, SearchX } from 'lucide-react';

const EmailSender = () => {
    const { user } = useAuth();
    const [targetGroup, setTargetGroup] = useState('students');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // Inactive users feature
    const [pdfs, setPdfs] = useState([]);
    const [selectedPdfId, setSelectedPdfId] = useState('');
    const [inactiveUsers, setInactiveUsers] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        if (targetGroup === 'inactive') {
            fetchPdfs();
        }
    }, [targetGroup]);

    const fetchPdfs = async () => {
        try {
            const { data } = await api.get('/pdfs');
            setPdfs(data);
        } catch (err) {
            console.error('Failed to load materials', err);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedPdfId) return;
        setAnalyzing(true);
        setInactiveUsers(null);
        try {
            const { data } = await api.get(`/analytics/inactive-users?pdfId=${selectedPdfId}`);
            setInactiveUsers(data);
        } catch (err) {
            setNotification({
                type: 'error',
                text: 'Failed to analyze inactive users.'
            });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setNotification(null);

        try {
            const payload = {
                targetGroup,
                subject,
                text: message
            };

            if (targetGroup === 'inactive') {
                if (!inactiveUsers || inactiveUsers.length === 0) {
                    setNotification({ type: 'error', text: 'No inactive users to send to.' });
                    setLoading(false);
                    return;
                }
                payload.inactiveUserIds = inactiveUsers.map(u => u._id);
            }

            const { data } = await api.post('/emails/send', payload);
            setNotification({ type: 'success', text: data.message });
            setSubject('');
            setMessage('');
        } catch (err) {
            setNotification({
                type: 'error',
                text: err.response?.data?.message || 'Failed to send emails.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                    <Send className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Notification Center</h1>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                        Send announcements or personalized messages to your users.
                    </p>
                </div>
            </div>

            {notification && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'}`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                    <p className="font-medium text-sm">{notification.text}</p>
                    <button
                        onClick={() => setNotification(null)}
                        className={`ml-auto shrink-0 p-1 rounded-md transition-colors ${notification.type === 'success' ? 'hover:bg-green-200/50' : 'hover:bg-red-200/50'}`}
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
                <div className="space-y-6">
                    {/* Audience Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                            Select Audience
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <label className={`
                                flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                                ${targetGroup === 'students'
                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10'
                                    : 'border-gray-200 dark:border-zinc-800 hover:border-brand-200 dark:hover:border-zinc-700 bg-transparent'}
                            `}>
                                <input
                                    type="radio"
                                    name="targetGroup"
                                    value="students"
                                    checked={targetGroup === 'students'}
                                    onChange={(e) => setTargetGroup(e.target.value)}
                                    className="sr-only"
                                />
                                <Users className={`w-5 h-5 ${targetGroup === 'students' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`} />
                                <span className={`font-semibold text-sm ${targetGroup === 'students' ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-400'}`}>All Students</span>
                            </label>

                            {user?.role === 'admin' && (
                                <>
                                    <label className={`
                                        flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                                        ${targetGroup === 'teachers'
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10'
                                            : 'border-gray-200 dark:border-zinc-800 hover:border-amber-200 dark:hover:border-zinc-700 bg-transparent'}
                                    `}>
                                        <input
                                            type="radio"
                                            name="targetGroup"
                                            value="teachers"
                                            checked={targetGroup === 'teachers'}
                                            onChange={(e) => setTargetGroup(e.target.value)}
                                            className="sr-only"
                                        />
                                        <ShieldCheck className={`w-5 h-5 ${targetGroup === 'teachers' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`} />
                                        <span className={`font-semibold text-sm ${targetGroup === 'teachers' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-400'}`}>All Teachers</span>
                                    </label>

                                    <label className={`
                                        flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                                        ${targetGroup === 'all'
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10'
                                            : 'border-gray-200 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-zinc-700 bg-transparent'}
                                    `}>
                                        <input
                                            type="radio"
                                            name="targetGroup"
                                            value="all"
                                            checked={targetGroup === 'all'}
                                            onChange={(e) => setTargetGroup(e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className="flex -space-x-2">
                                            <ShieldCheck className={`w-5 h-5 relative z-10 ${targetGroup === 'all' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                                            <Users className={`w-5 h-5 ${targetGroup === 'all' ? 'text-purple-600 dark:text-purple-400 opacity-70' : 'text-gray-400 opacity-70'}`} />
                                        </div>
                                        <span className={`font-semibold text-sm ${targetGroup === 'all' ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-400'}`}>Everyone</span>
                                    </label>
                                </>
                            )}

                            <label className={`
                                flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all sm:col-span-2 lg:col-span-1
                                ${targetGroup === 'inactive'
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'
                                    : 'border-gray-200 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-zinc-700 bg-transparent'}
                            `}>
                                <input
                                    type="radio"
                                    name="targetGroup"
                                    value="inactive"
                                    checked={targetGroup === 'inactive'}
                                    onChange={(e) => setTargetGroup(e.target.value)}
                                    className="sr-only"
                                />
                                <SearchX className={`w-5 h-5 ${targetGroup === 'inactive' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                                <span className={`font-semibold text-sm ${targetGroup === 'inactive' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-400'}`}>Inactive Users</span>
                            </label>
                        </div>
                    </div>

                    {/* Inactive Users Selector */}
                    {targetGroup === 'inactive' && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900">
                            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Search className="w-4 h-4" /> Analyze Inactivity
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select
                                    value={selectedPdfId}
                                    onChange={(e) => setSelectedPdfId(e.target.value)}
                                    className="flex-1 rounded-xl border-gray-300 dark:border-zinc-800 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 p-3"
                                >
                                    <option value="">Select Material to check activity...</option>
                                    {pdfs.map(pdf => (
                                        <option key={pdf._id} value={pdf._id}>
                                            {pdf.title} {pdf.courseCode ? `(${pdf.courseCode})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAnalyze}
                                    disabled={!selectedPdfId || analyzing}
                                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                                >
                                    {analyzing ? 'Analyzing...' : 'Find Users'}
                                </button>
                            </div>

                            {inactiveUsers && (
                                <div className="mt-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-indigo-100 dark:border-zinc-800">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Found <span className="text-indigo-600 font-bold">{inactiveUsers.length}</span> students with no activity on this material.
                                    </p>
                                    {inactiveUsers.length > 0 && (
                                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 max-h-32 overflow-y-auto">
                                            {inactiveUsers.map(u => (
                                                <div key={u._id} className="py-1 border-b border-gray-100 dark:border-zinc-800 last:border-0">
                                                    {u.name} ({u.email})
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Subject */}
                    <div>
                        <label htmlFor="subject" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                            Subject Line
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <AlignLeft className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                id="subject"
                                placeholder="e.g. Important Update on New Course Materials"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="pl-10 w-full rounded-xl border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 py-3 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Message Body */}
                    <div>
                        <label htmlFor="message" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                            Message Body
                        </label>
                        <div className="relative">
                            <textarea
                                id="message"
                                rows={8}
                                placeholder="Write your email content here. HTML is not supported currently, but line breaks will be preserved."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full rounded-xl border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 p-4 transition-colors"
                                required
                            />
                            <div className="absolute bottom-3 right-4 text-xs font-medium text-gray-400">
                                {message.length} characters
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || !subject.trim() || !message.trim() || (targetGroup === 'inactive' && (!inactiveUsers || inactiveUsers.length === 0))}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 focus:ring-brand-500 focus:ring-offset-brand-200 text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-xl py-3 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Send Email Broadcast
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EmailSender;
