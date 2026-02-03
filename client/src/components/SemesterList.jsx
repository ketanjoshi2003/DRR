import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Upload, Filter, Calendar, Trash2, Search } from 'lucide-react';
import CustomSelect from './CustomSelect';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const SemesterList = () => {
    const [semesters, setSemesters] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSemester, setNewSemester] = useState({ name: '', code: '', description: '', courseId: '' });
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    const [uploading, setUploading] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const courseId = params.get('courseId');
        if (courseId) {
            setSelectedCourse(courseId);
        }
    }, [location]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [semestersRes, coursesRes] = await Promise.all([
                api.get('/semesters'),
                api.get('/courses')
            ]);
            setSemesters(Array.isArray(semestersRes.data) ? semestersRes.data : []);
            setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSemester = async (e) => {
        e.preventDefault();
        try {
            await api.post('/semesters', newSemester);
            setShowAddModal(false);
            setNewSemester({ name: '', code: '', description: '', courseId: '' });
            fetchData();
        } catch (error) {
            console.error('Error adding semester:', error);
            alert('Failed to add semester');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} semesters? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete('/semesters', { data: { ids: selectedIds } });
            alert('Selected semesters deleted successfully.');
            setSelectedIds([]);
            setIsDeleteMode(false);
            fetchData();
        } catch (error) {
            console.error('Error deleting semesters:', error);
            alert('Failed to delete semesters');
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredSemesters.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredSemesters.map(s => s._id));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const { data } = await api.post('/semesters/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert(`Semesters processed: ${data.message || 'Success'}`);
            fetchData();
        } catch (error) {
            console.error('Error uploading CSV:', error);
            const msg = error.response?.data?.message || error.message;
            alert(`Failed to upload semesters: ${msg}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const filteredSemesters = semesters.filter(s => {
        const courseId = s.course?._id || s.course;
        if (selectedCourse !== 'all' && courseId !== selectedCourse) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query);
        }
        return true;
    });

    if (loading) return <div>Loading semesters...</div>;

    return (
        <div>
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Semesters</h1>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                    <div className="relative w-full md:flex-1 max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search semesters..."
                            className="block w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-xl leading-5 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 sm:text-sm transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                        <div className="w-full md:w-[200px]">
                            <CustomSelect
                                icon={Filter}
                                value={selectedCourse}
                                onChange={(newValue) => setSelectedCourse(newValue)}
                                options={[
                                    { value: 'all', label: 'All Courses' },
                                    ...courses.map(c => ({ value: c._id, label: `${c.name} (${c.code})` }))
                                ]}
                                placeholder="Filter Course"
                            />
                        </div>

                        {user?.role === 'admin' && (
                            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                                <input
                                    type="file"
                                    accept=".csv"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />

                                {!isDeleteMode ? (
                                    <>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm font-semibold shadow-lg shadow-green-500/10 disabled:opacity-50"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {uploading ? 'Processing...' : 'Upload CSV'}
                                        </button>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all text-sm font-semibold shadow-lg shadow-brand-500/20"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Semester
                                        </button>
                                        <button
                                            onClick={() => setIsDeleteMode(true)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-sm font-semibold shadow-lg shadow-red-500/20 flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                        <button
                                            onClick={handleSelectAll}
                                            className="flex-1 md:flex-none px-4 py-2 bg-gray-100 dark:bg-zinc-900 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-800 text-sm font-bold transition-all"
                                        >
                                            {selectedIds.length === filteredSemesters.length ? 'Deselect' : 'Select All'}
                                        </button>
                                        <button
                                            onClick={handleDeleteSelected}
                                            disabled={selectedIds.length === 0}
                                            className="flex-1 md:flex-none px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-bold transition-all shadow-lg shadow-red-500/20"
                                        >
                                            Delete ({selectedIds.length})
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsDeleteMode(false);
                                                setSelectedIds([]);
                                            }}
                                            className="px-4 py-2 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 text-sm font-bold transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSemesters.map((semester) => (
                    <div
                        key={semester._id}
                        className={`bg-white dark:bg-zinc-900 rounded-xl border p-6 transition-all duration-150 transform-gpu relative overflow-hidden flex flex-col h-full ${isDeleteMode
                            ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/50'
                            : 'border-gray-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg dark:hover:shadow-brand-500/10 hover:-translate-y-1'
                            } ${selectedIds.includes(semester._id) ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
                        onClick={() => isDeleteMode && toggleSelection(semester._id)}
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-5 dark:opacity-10 text-gray-900 dark:text-gray-100">
                            <Calendar className="w-24 h-24" />
                        </div>
                        <div className="relative z-10 flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 text-xs font-semibold rounded-full border border-brand-100 dark:border-brand-900/50">
                                        {semester.course?._id ? (courses.find(c => c._id === semester.course._id)?.code || 'Unknown') : 'Unknown'}
                                    </span>
                                    <span className="px-2 py-1 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 text-xs font-mono rounded-full border border-gray-200 dark:border-zinc-700">
                                        {semester.code}
                                    </span>
                                </div>
                                {isDeleteMode && (
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(semester._id)}
                                        onChange={() => toggleSelection(semester._id)}
                                        className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{semester.name}</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                                {semester.description || 'No description available.'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {filteredSemesters.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-dashed border-gray-300 dark:border-zinc-800">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                    <p>No semesters found for the selected criteria.</p>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Add New Semester</h2>
                        <form onSubmit={handleAddSemester}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Course</label>
                                    <select
                                        required
                                        value={newSemester.courseId}
                                        onChange={(e) => setNewSemester({ ...newSemester, courseId: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2 transition-colors duration-200"
                                    >
                                        <option value="">-- Select Course --</option>
                                        {courses.map(c => (
                                            <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSemester.name}
                                        onChange={(e) => setNewSemester({ ...newSemester, name: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2 transition-colors duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSemester.code}
                                        onChange={(e) => setNewSemester({ ...newSemester, code: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2 transition-colors duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea
                                        value={newSemester.description}
                                        onChange={(e) => setNewSemester({ ...newSemester, description: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2 transition-colors duration-200"
                                        rows="3"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-sm font-medium transition-colors"
                                >
                                    Add Semester
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SemesterList;
