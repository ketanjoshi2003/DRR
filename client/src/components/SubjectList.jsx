import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Book, Plus, Upload, Trash2, Filter, ChevronDown, Check } from 'lucide-react';
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
    }, []);

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

    const handleDeleteAllSubjects = async () => {
        if (!window.confirm('Are you sure you want to delete ALL subjects? This action cannot be undone.')) {
            return;
        }
        try {
            await api.delete('/subjects');
            alert('All subjects deleted successfully.');
            fetchData();
        } catch (error) {
            console.error('Error deleting subjects:', error);
            alert('Failed to delete subjects');
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

    // Filter subjects first
    const filteredSubjects = subjects.filter(s => {
        if (selectedCourse !== 'all' && s.course?._id !== selectedCourse) return false;
        if (selectedSemester !== 'all' && s.semester?._id !== selectedSemester) return false;
        return true;
    });

    // Group subjects by Semester
    // { "Semester 1": [subjects...], "Semester 2": [subjects...] }
    const subjectsBySemester = filteredSubjects.reduce((acc, subject) => {
        const semName = subject.semester?.name || 'Unassigned Semester';
        if (!acc[semName]) {
            acc[semName] = [];
        }
        acc[semName].push(subject);
        return acc;
    }, {});

    // Get sorted semester names for display order
    // Order by name if possible, or keep as is.
    const sortedSemesterNames = Object.keys(subjectsBySemester).sort();

    const filteredSemesters = selectedCourse === 'all'
        ? semesters
        : semesters.filter(s => s.course?._id === selectedCourse);


    if (loading) return <div>Loading subjects...</div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">Subjects</h1>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* Course Filter */}
                    {/* Course Filter */}
                    <div className="w-[200px]">
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
                            placeholder="Filter by Course"
                        />
                    </div>

                    {/* Semester Filter */}
                    <div className="w-[200px]">
                        <CustomSelect
                            icon={Filter}
                            value={selectedSemester}
                            onChange={setSelectedSemester}
                            options={[
                                { value: 'all', label: 'All Semesters' },
                                ...sortedSemesterNames.map(name => ({ value: name, label: name }))
                            ]}
                            placeholder="Filter by Semester"
                        />
                    </div>

                    {user?.role === 'admin' && (
                        <>
                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={handleDeleteAllSubjects}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete All
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                            >
                                <Upload className="w-4 h-4" />
                                {uploading ? '...' : 'CSV'}
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Add Subject
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Display grouped by Semester */}
            {sortedSemesterNames.length > 0 ? (
                sortedSemesterNames.map(semName => (
                    <div key={semName} className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">{semName}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {subjectsBySemester[semName].map((subject) => (
                                <div key={subject._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 transform-gpu relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-5">
                                        <Book className="w-24 h-24" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full border border-brand-100">
                                                {subject.course?.code || 'Unknown'}
                                            </span>
                                            <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-mono rounded-full border border-gray-200">
                                                {subject.code}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">{subject.name}</h3>
                                        <p className="text-gray-600 text-sm line-clamp-3">
                                            {subject.description || 'No description available.'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Book className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No subjects found for the selected criteria.</p>
                </div>
            )}

            {/* Add Subject Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">Add New Subject</h2>
                        <form onSubmit={handleAddSubject}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
                                    <select
                                        required
                                        value={newSubject.courseId}
                                        onChange={(e) => setNewSubject({ ...newSubject, courseId: e.target.value, semesterId: '' })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    >
                                        <option value="">-- Select Course --</option>
                                        {courses.map(c => (
                                            <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Semester</label>
                                    <select
                                        required
                                        value={newSubject.semesterId}
                                        onChange={(e) => setNewSubject({ ...newSubject, semesterId: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSubject.name}
                                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSubject.code}
                                        onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={newSubject.description}
                                        onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                        rows="3"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-sm font-medium"
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
