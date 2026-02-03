import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Book, Plus, Upload, Trash2, Filter, Search, Bookmark } from 'lucide-react';
import CustomSelect from './CustomSelect';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const SubjectList = () => {
    const [subjects, setSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '', courseId: '', semesterId: '' });
    const { user } = useAuth();
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
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const courseId = params.get('courseId');
        const semesterId = params.get('semesterId');
        if (courseId) {
            setSelectedCourse(courseId);
        }
        if (semesterId) {
            setSelectedSemester(semesterId);
        }
    }, [location]);

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
            const [subjectsRes, coursesRes, semestersRes] = await Promise.all([
                api.get('/subjects'),
                api.get('/courses'),
                api.get('/semesters')
            ]);
            setSubjects(subjectsRes.data);
            setCourses(coursesRes.data);
            setSemesters(semestersRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/subjects', newSubject);
            setShowAddModal(false);
            setNewSubject({ name: '', code: '', description: '', courseId: '', semesterId: '' });
            fetchData();
        } catch (error) {
            console.error('Error adding subject:', error);
            alert('Failed to add subject');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} subjects? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete('/subjects', { data: { ids: selectedIds } });
            alert('Selected subjects deleted successfully.');
            setSelectedIds([]);
            setIsDeleteMode(false);
            fetchData();
        } catch (error) {
            console.error('Error deleting subjects:', error);
            alert('Failed to delete subjects');
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredSubjects.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredSubjects.map(s => s._id));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const { data } = await api.post('/subjects/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert(`Subjects processed: ${data.message || 'Success'}`);
            fetchData();
        } catch (error) {
            console.error('Error uploading CSV:', error);
            const msg = error.response?.data?.message || error.message;
            alert(`Failed to upload subjects: ${msg}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const filteredSubjects = subjects.filter(s => {
        const sCourseId = s.course?._id || s.course;
        const sSemesterId = s.semester?._id || s.semester;

        if (selectedCourse !== 'all' && sCourseId !== selectedCourse) return false;
        if (selectedSemester !== 'all' && sSemesterId !== selectedSemester) return false;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const courseName = s.course?.name || '';
            const semesterName = s.semester?.name || '';

            return (
                s.name.toLowerCase().includes(query) ||
                s.code.toLowerCase().includes(query) ||
                courseName.toLowerCase().includes(query) ||
                semesterName.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const subjectsBySemester = filteredSubjects.reduce((acc, subject) => {
        const semName = subject.semester?.name || 'Unassigned Semester';
        if (!acc[semName]) {
            acc[semName] = [];
        }
        acc[semName].push(subject);
        return acc;
    }, {});

    const sortedSemesterNames = Object.keys(subjectsBySemester).sort();

    const filteredSemesters = selectedCourse === 'all'
        ? semesters
        : semesters.filter(s => s.course?._id === selectedCourse);


    if (loading) return <div>Loading subjects...</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Subjects</h1>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-center w-full">
                    <div className="relative w-full md:flex-1 max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search subjects..."
                            className="block w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-xl leading-5 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 sm:text-sm transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            <div className="w-full sm:w-[180px]">
                                <CustomSelect
                                    icon={Filter}
                                    value={selectedCourse}
                                    onChange={(newValue) => {
                                        setSelectedCourse(newValue);
                                        setSelectedSemester('all');
                                    }}
                                    options={[
                                        { value: 'all', label: 'All Courses' },
                                        ...courses.map(c => ({ value: c._id, label: `${c.name} (${c.code})` }))
                                    ]}
                                    placeholder="Filter Course"
                                />
                            </div>

                            <div className="w-full sm:w-[180px]">
                                <CustomSelect
                                    icon={Filter}
                                    value={selectedSemester}
                                    onChange={setSelectedSemester}
                                    options={[
                                        { value: 'all', label: 'All Semesters' },
                                        ...filteredSemesters.map(s => ({
                                            value: s._id,
                                            label: selectedCourse === 'all' ? `${s.name} (${s.course?.code || '?'})` : s.name
                                        }))
                                    ]}
                                    placeholder="Filter Semester"
                                />
                            </div>
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
                                            Add Subject
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
                                            {selectedIds.length === filteredSubjects.length ? 'Deselect' : 'Select All'}
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

            {sortedSemesterNames.length > 0 ? (
                sortedSemesterNames.map(semName => (
                    <div key={semName} className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-zinc-800 pb-2">{semName}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subjectsBySemester[semName].map((subject) => (
                                <div
                                    key={subject._id}
                                    className={`bg-white dark:bg-zinc-900 rounded-xl border p-5 transition-all duration-150 transform-gpu relative overflow-hidden group ${isDeleteMode
                                        ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/50'
                                        : 'border-gray-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg dark:hover:shadow-brand-500/10 hover:-translate-y-1'
                                        } ${selectedIds.includes(subject._id) ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
                                    onClick={() => isDeleteMode && toggleSelection(subject._id)}
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-5 dark:opacity-10 text-gray-900 dark:text-gray-100">
                                        <Book className="w-24 h-24" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 text-xs font-semibold rounded-full border border-brand-100 dark:border-brand-900/50">
                                                    {subject.course?.code || 'Unknown'}
                                                </span>
                                                <span className="px-2 py-1 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 text-xs font-mono rounded-full border border-gray-200 dark:border-zinc-700">
                                                    {subject.code}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!isDeleteMode && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleCollectionItem('subjects', subject._id);
                                                        }}
                                                        className={`p-2 rounded-full transition-all ${userCollection.subjects?.some(s => (s._id || s) === subject._id)
                                                            ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/40'
                                                            : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                                                            }`}
                                                    >
                                                        <Bookmark className={`w-5 h-5 ${userCollection.subjects?.some(s => (s._id || s) === subject._id) ? 'fill-current' : ''}`} />
                                                    </button>
                                                )}
                                                {isDeleteMode && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(subject._id)}
                                                        onChange={() => toggleSelection(subject._id)}
                                                        className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{subject.name}</h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                                            {subject.description || 'No description available.'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-dashed border-gray-300 dark:border-zinc-800">
                    <Book className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                    <p>No subjects found for the selected criteria.</p>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border dark:border-zinc-800 shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Add New Subject</h2>
                        <form onSubmit={handleAddSubject}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Course</label>
                                    <select
                                        required
                                        value={newSubject.courseId}
                                        onChange={(e) => setNewSubject({ ...newSubject, courseId: e.target.value, semesterId: '' })}
                                        className="block w-full rounded-md border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2 transition-colors duration-200"
                                    >
                                        <option value="">-- Select Course --</option>
                                        {courses.map(c => (
                                            <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Semester</label>
                                    <select
                                        required
                                        value={newSubject.semesterId}
                                        onChange={(e) => setNewSubject({ ...newSubject, semesterId: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2 transition-colors duration-200"
                                        disabled={!newSubject.courseId}
                                    >
                                        <option value="">-- Select Semester --</option>
                                        {semesters
                                            .filter(s => s.course?._id === newSubject.courseId)
                                            .map(s => (
                                                <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                                            ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSubject.name}
                                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2 transition-colors duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSubject.code}
                                        onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 dark:border-zinc-800 shadow-sm focus:border-brand-500 dark:focus:border-brand-500 focus:ring-brand-500 dark:focus:ring-brand-500 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 border p-2 transition-colors duration-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea
                                        value={newSubject.description}
                                        onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
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
                                    className="px-4 py-2 bg-brand-600 dark:bg-brand-700 text-white rounded-lg hover:bg-brand-700 dark:hover:bg-brand-600 shadow-sm dark:shadow-brand-500/10 font-medium transition-colors"
                                >
                                    Add Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectList;
