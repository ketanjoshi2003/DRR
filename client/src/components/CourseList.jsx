import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Book, Upload, Trash2, Search, Bookmark } from 'lucide-react';
import CustomSelect from './CustomSelect';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CourseList = () => {
    const [courses, setCourses] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSemesters, setSelectedSemesters] = useState({}); // { courseId: semesterId }
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCourse, setNewCourse] = useState({ name: '', code: '', description: '' });
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [uploading, setUploading] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [userCollection, setUserCollection] = useState({ courses: [], subjects: [], pdfs: [] });

    const fetchUserCollection = async () => {
        try {
            const { data } = await api.get('/collection');
            setUserCollection(data);
        } catch (error) {
            console.error('Error fetching collection:', error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchUserCollection();
    }, []);

    const toggleCollectionItem = async (type, id) => {
        const isCollected = userCollection[type]?.some(item => (item._id || item) === id);
        try {
            if (isCollected) {
                await api.post('/collection/remove', { type, id });
            } else {
                await api.post('/collection/add', { type, id });
            }
            fetchUserCollection();
        } catch (error) {
            console.error('Error toggling collection:', error);
        }
    };

    const fetchData = async () => {
        try {
            const [coursesRes, semestersRes] = await Promise.all([
                api.get('/courses'),
                api.get('/semesters')
            ]);
            setCourses(coursesRes.data);
            setSemesters(Array.isArray(semestersRes.data) ? semestersRes.data : []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        try {
            await api.post('/courses', newCourse);
            setShowAddModal(false);
            setNewCourse({ name: '', code: '', description: '' });
            fetchData();
        } catch (error) {
            console.error('Error adding course:', error);
            alert('Failed to add course');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} courses? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete('/courses', { data: { ids: selectedIds } });
            alert('Selected courses deleted successfully.');
            setSelectedIds([]);
            setIsDeleteMode(false);
            fetchData();
        } catch (error) {
            console.error('Error deleting courses:', error);
            alert('Failed to delete courses');
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectAll = () => {
        if (selectedIds.length === filteredCourses.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCourses.map(c => c._id));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await api.post('/courses/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert('Courses uploaded successfully!');
            fetchData();
        } catch (error) {
            console.error('Error uploading CSV:', error);
            const msg = error.response?.data?.message || error.message;
            alert(`Failed to upload courses: ${msg}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSemesterChange = (courseId, semesterId) => {
        setSelectedSemesters(prev => ({
            ...prev,
            [courseId]: semesterId
        }));
    };

    const handleViewSubjects = (courseId) => {
        const semesterId = selectedSemesters[courseId];
        let url = `/subjects?courseId=${courseId}`;
        if (semesterId && semesterId !== 'all') {
            url += `&semesterId=${semesterId}`;
        }
        navigate(url);
    };

    if (loading) return <div>Loading courses...</div>;

    return (
        <div>
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Courses</h1>
                    <div className="md:hidden">
                        {user?.role === 'admin' && !isDeleteMode && (
                            <button
                                onClick={() => setIsDeleteMode(true)}
                                className="p-2 text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                    <div className="relative w-full md:flex-1 max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search courses..."
                            className="block w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-xl leading-5 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 sm:text-sm transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                                        Add Course
                                    </button>
                                    <button
                                        onClick={() => setIsDeleteMode(true)}
                                        className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-sm font-semibold shadow-lg shadow-red-500/20"
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
                                        {selectedIds.length === filteredCourses.length ? 'Deselect' : 'Select All'}
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => {
                    const courseSemesters = semesters.filter(s => s.course?._id === course._id);

                    return (
                        <div
                            key={course._id}
                            className={`bg-white dark:bg-zinc-950 rounded-xl border p-6 transition-all duration-150 transform-gpu flex flex-col h-full ${isDeleteMode
                                ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/50'
                                : 'border-gray-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg dark:hover:shadow-brand-500/10 hover:-translate-y-1'
                                } ${selectedIds.includes(course._id) ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
                            onClick={() => isDeleteMode && toggleSelection(course._id)}
                        >
                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-brand-50 dark:bg-brand-900/40 rounded-lg">
                                        <Book className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isDeleteMode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleCollectionItem('courses', course._id);
                                                }}
                                                className={`p-2 rounded-full transition-all ${userCollection.courses?.some(c => (c._id || c) === course._id)
                                                    ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/40'
                                                    : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                                                    }`}
                                            >
                                                <Bookmark className={`w-5 h-5 ${userCollection.courses?.some(c => (c._id || c) === course._id) ? 'fill-current' : ''}`} />
                                            </button>
                                        )}
                                        {isDeleteMode && (
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(course._id)}
                                                onChange={() => toggleSelection(course._id)}
                                                className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{course.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">{course.code}</p>
                                <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                                    {course.description || 'No description available.'}
                                </p>

                                <div className="mt-4">
                                    <label className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Select Semester</label>
                                    <div className="relative mt-1">
                                        <CustomSelect
                                            value={selectedSemesters[course._id] || 'all'}
                                            onChange={(newValue) => handleSemesterChange(course._id, newValue)}
                                            options={[
                                                { value: 'all', label: 'All Semesters' },
                                                ...courseSemesters.map(sem => ({ value: sem._id, label: sem.name }))
                                            ]}
                                            placeholder="Select Semester"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-between items-center gap-3">
                                <button
                                    onClick={() => handleViewSubjects(course._id)}
                                    className="flex-1 text-center px-4 py-2 bg-brand-600 dark:bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-700 dark:hover:bg-brand-600 transition-colors shadow-sm dark:shadow-brand-500/10"
                                >
                                    View Subjects
                                </button>
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => navigate(`/semesters?courseId=${course._id}`)}
                                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        Manage Semesters
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {courses.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No courses found.
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Add New Course</h2>
                        <form onSubmit={handleAddCourse}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCourse.name}
                                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                                        className="block w-full rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2.5 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCourse.code}
                                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                                        className="block w-full rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2.5 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea
                                        value={newCourse.description}
                                        onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                        className="block w-full rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2.5 transition-all"
                                        rows="3"
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 font-bold"
                                >
                                    Add Course
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseList;
