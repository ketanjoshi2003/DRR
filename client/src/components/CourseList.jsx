import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Book, Upload, Trash2, Search, Bookmark, ChevronDown, ChevronUp, Calendar, X } from 'lucide-react';
import CustomSelect from './CustomSelect';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CourseList = () => {
    const [courses, setCourses] = useState([]);
    const [semesters, setSemesters] = useState([]);  // all semesters
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCourse, setNewCourse] = useState({ name: '', code: '', description: '', semesterCount: '' });
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [userCollection, setUserCollection] = useState({ courses: [], subjects: [], pdfs: [] });

    // Inline semester management per course
    const [expandedCourse, setExpandedCourse] = useState(null);
    const [selectedSemesters, setSelectedSemesters] = useState({}); // { courseId: semId }
    const [showAddSemModal, setShowAddSemModal] = useState(null); // courseId
    const [newSem, setNewSem] = useState({ name: '', code: '', description: '' });
    const [deletingSemId, setDeletingSemId] = useState(null);

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDeleteMode || !expandedCourse) return;
            if (!event.target.closest('.course-card-container')) {
                setExpandedCourse(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [expandedCourse, isDeleteMode]);

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

    const handleAddSemester = async (e, courseId) => {
        e.preventDefault();
        try {
            await api.post('/semesters', { ...newSem, courseId });
            setShowAddSemModal(null);
            setNewSem({ name: '', code: '', description: '' });
            fetchData();
        } catch (error) {
            console.error('Error adding semester:', error);
            alert('Failed to add semester');
        }
    };

    const handleDeleteSemester = async (semId) => {
        setDeletingSemId(semId);
        try {
            await api.delete('/semesters', { data: { ids: [semId] } });
            fetchData();
        } catch (error) {
            console.error('Error deleting semester:', error);
            alert('Failed to delete semester');
        } finally {
            setDeletingSemId(null);
        }
    };

    const handleCourseClick = (courseId) => {
        if (isDeleteMode) return;
        setExpandedCourse(prev => prev === courseId ? null : courseId);
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        try {
            const { data: savedCourse } = await api.post('/courses', {
                name: newCourse.name,
                code: newCourse.code,
                description: newCourse.description
            });

            // Auto-generate semesters based on count
            const count = parseInt(newCourse.semesterCount);
            if (!isNaN(count) && count > 0) {
                const semesterPromises = [];
                for (let i = 1; i <= count; i++) {
                    semesterPromises.push(api.post('/semesters', {
                        name: `Semester ${i}`,
                        code: `${savedCourse.code}-SEM${i}`,
                        courseId: savedCourse._id
                    }));
                }
                await Promise.all(semesterPromises);
            }

            setShowAddModal(false);
            setNewCourse({ name: '', code: '', description: '', semesterCount: '' });
            fetchData();
        } catch (error) {
            console.error('Error adding course:', error);
            alert('Failed to add course');
        }
    };



    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        try {
            await api.delete('/courses', { data: { ids: selectedIds } });
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

    const handleViewSubjects = (courseId) => {
        const semId = selectedSemesters[courseId];
        let url = `/subjects?courseId=${courseId}`;
        if (semId) url += `&semesterId=${semId}`;
        navigate(url);
    };

    if (loading) return <div>Loading courses...</div>;

    return (
        <div>
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Courses</h1>
                    <div className="md:hidden">
                        {(user?.role === 'admin' || user?.role === 'teacher') && !isDeleteMode && (
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

                    {(user?.role === 'admin' || user?.role === 'teacher') && (
                        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                            {!isDeleteMode ? (
                                <>
                                    <button
                                        onClick={() => navigate('/upload')}
                                        className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm font-semibold shadow-lg shadow-green-500/10 disabled:opacity-50"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Smart Upload
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                {filteredCourses.map((course) => {
                    const courseSemesters = semesters.filter(s => s.course?._id === course._id);
                    const isExpanded = expandedCourse === course._id;
                    const selectedSemId = selectedSemesters[course._id];
                    const selectedSem = courseSemesters.find(s => s._id === selectedSemId);

                    return (
                        <div
                            key={course._id}
                            className={`course-card-container bg-white dark:bg-zinc-900 rounded-xl border transition-all duration-200 flex flex-col overflow-hidden ${isDeleteMode
                                ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/50'
                                : 'border-gray-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg dark:hover:shadow-brand-500/10'
                                } ${selectedIds.includes(course._id) ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
                            onClick={() => isDeleteMode && toggleSelection(course._id)}
                        >
                            {/* Card Top */}
                            <div className="p-6 flex flex-col flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-brand-50 dark:bg-brand-900/40 rounded-lg">
                                        <Book className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isDeleteMode && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleCollectionItem('courses', course._id); }}
                                                className={`p-2 rounded-full transition-all ${userCollection.courses?.some(c => (c._id || c) === course._id)
                                                    ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/40'
                                                    : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'}`}
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
                                {course.description && (
                                    <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                                        {course.description}
                                    </p>
                                )}

                                <div className="mt-4 flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleViewSubjects(course._id); }}
                                        className="flex-1 text-center px-4 py-2 bg-brand-600 dark:bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-700 dark:hover:bg-brand-600 transition-colors shadow-sm"
                                    >
                                        View Subjects
                                    </button>
                                    {/* Semesters toggle button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleCourseClick(course._id); }}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${isExpanded
                                            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800'
                                            : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:border-brand-300 dark:hover:border-brand-700'
                                            }`}
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{selectedSem ? (selectedSem.name.length > 8 ? selectedSem.code || selectedSem.name : selectedSem.name) : courseSemesters.length}</span>
                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Inline Semester Panel */}
                            {isExpanded && !isDeleteMode && (
                                <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/50 px-5 py-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Semesters</p>
                                        {(user?.role === 'admin' || user?.role === 'teacher') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowAddSemModal(course._id); setNewSem({ name: '', code: '', description: '' }); }}
                                                className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
                                            >
                                                <Plus className="w-3 h-3" /> Add
                                            </button>
                                        )}
                                    </div>

                                    {courseSemesters.length === 0 ? (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">No semesters defined for this course.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                            {/* All Semesters option */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSemesters(prev => ({ ...prev, [course._id]: null }));
                                                    setExpandedCourse(null);
                                                }}
                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${!selectedSemesters[course._id]
                                                    ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800'
                                                    : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-brand-200 dark:hover:border-brand-800'
                                                    }`}
                                            >
                                                <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${!selectedSemesters[course._id]
                                                    ? 'border-brand-500 bg-brand-500'
                                                    : 'border-gray-300 dark:border-zinc-600'
                                                    }`} />
                                                <span className={`text-xs font-medium ${!selectedSemesters[course._id]
                                                    ? 'text-brand-700 dark:text-brand-400'
                                                    : 'text-gray-600 dark:text-gray-400'
                                                    }`}>All Semesters</span>
                                            </div>
                                            {courseSemesters.map(sem => (
                                                <div
                                                    key={sem._id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSemesters(prev => ({ ...prev, [course._id]: sem._id }));
                                                        setExpandedCourse(null);
                                                    }}
                                                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all group ${selectedSemesters[course._id] === sem._id
                                                        ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800'
                                                        : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-brand-200 dark:hover:border-brand-800'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${selectedSemesters[course._id] === sem._id
                                                            ? 'border-brand-500 bg-brand-500'
                                                            : 'border-gray-300 dark:border-zinc-600'
                                                            }`} />
                                                        <div className="min-w-0">
                                                            <p className={`text-xs font-medium truncate ${selectedSemesters[course._id] === sem._id
                                                                ? 'text-brand-700 dark:text-brand-400'
                                                                : 'text-gray-700 dark:text-gray-300'
                                                                }`}>{sem.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono">{sem.code}</p>
                                                        </div>
                                                    </div>
                                                    {(user?.role === 'admin' || user?.role === 'teacher') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteSemester(sem._id); }}
                                                            disabled={deletingSemId === sem._id}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all disabled:opacity-50 flex-shrink-0"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
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
                <div className="fixed inset-0 flex items-start justify-center pt-12 sm:pt-24 z-[60] p-4 animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0"
                        onClick={() => setShowAddModal(false)}
                    />
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-full max-w-md animate-in zoom-in duration-200 overflow-hidden relative z-10">
                        <div className="flex items-center justify-between p-6 border-b dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-50 dark:bg-brand-900/40 rounded-lg">
                                    <Book className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add New Course</h2>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl text-gray-400 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCourse} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Course Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter course name..."
                                        value={newCourse.name}
                                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 p-3 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Course Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CS101"
                                        value={newCourse.code}
                                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 p-3 transition-all outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Description</label>
                                    <textarea
                                        placeholder="Optional course details..."
                                        value={newCourse.description}
                                        onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 p-3 transition-all outline-none resize-none"
                                        rows="2"
                                    />
                                </div>

                                {/* Number of Semesters Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Number of Semesters</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="12"
                                        placeholder="e.g. 4"
                                        value={newCourse.semesterCount}
                                        onChange={(e) => setNewCourse({ ...newCourse, semesterCount: e.target.value })}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 p-3 transition-all outline-none"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 ml-1">The system will automatically create Semester 1, Semester 2... for you.</p>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 font-bold transition-all active:scale-[0.98]"
                                >
                                    Create Course
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddSemModal && (
                <div className="fixed inset-0 flex items-start justify-center pt-12 sm:pt-24 z-[70] p-4 animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0"
                        onClick={() => setShowAddSemModal(null)}
                    />
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-full max-w-sm animate-in zoom-in duration-200 overflow-hidden relative z-10">
                        <div className="flex items-center justify-between p-5 border-b dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-50 dark:bg-brand-900/40 rounded-lg">
                                    <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add Semester</h2>
                            </div>
                            <button
                                onClick={() => setShowAddSemModal(null)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={(e) => handleAddSemester(e, showAddSemModal)} className="p-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Semester Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Semester 1"
                                        value={newSem.name}
                                        onChange={(e) => setNewSem({ ...newSem, name: e.target.value })}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 p-2.5 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Semester Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. SEM1"
                                        value={newSem.code}
                                        onChange={(e) => setNewSem({ ...newSem, code: e.target.value })}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 p-2.5 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <textarea
                                        placeholder="Description..."
                                        value={newSem.description}
                                        onChange={(e) => setNewSem({ ...newSem, description: e.target.value })}
                                        className="block w-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 p-2.5 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none resize-none"
                                        rows="2"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddSemModal(null)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl text-sm font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 text-sm font-bold shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]"
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

export default CourseList;
