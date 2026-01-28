import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Book, Upload, Trash2 } from 'lucide-react';
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

    useEffect(() => {
        fetchData();
    }, []);

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

    const handleDeleteAllCourses = async () => {
        if (!window.confirm('Are you sure you want to delete ALL courses? This action cannot be undone.')) {
            return;
        }
        try {
            await api.delete('/courses');
            alert('All courses deleted successfully.');
            fetchData();
        } catch (error) {
            console.error('Error deleting courses:', error);
            alert('Failed to delete courses');
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Courses</h1>
                {user?.role === 'admin' && (
                    <div className="flex gap-3">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={handleDeleteAllCourses}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete All
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Upload CSV'}
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Course
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => {
                    const courseSemesters = semesters.filter(s => s.course?._id === course._id);

                    return (
                        <div key={course._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 transform-gpu flex flex-col h-full">
                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-brand-50 rounded-lg">
                                        <Book className="w-8 h-8 text-brand-600" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">{course.name}</h3>
                                <p className="text-sm text-gray-500 font-mono mt-1">{course.code}</p>
                                <p className="mt-2 text-gray-600 text-sm line-clamp-3">
                                    {course.description || 'No description available.'}
                                </p>

                                {/* Semester Dropdown */}
                                <div className="mt-4">
                                    <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Select Semester</label>
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
                                    className="flex-1 text-center px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                                >
                                    View Subjects
                                </button>
                                <button
                                    onClick={() => navigate(`/semesters?courseId=${course._id}`)}
                                    className="text-sm text-gray-500 hover:text-brand-600 font-medium hover:bg-brand-50 px-3 py-2 rounded-lg transition-colors"
                                >
                                    Manage Semesters
                                </button>
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

            {/* Add Course Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add New Course</h2>
                        <form onSubmit={handleAddCourse}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Course Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCourse.name}
                                        onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Course Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={newCourse.code}
                                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        value={newCourse.description}
                                        onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
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
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
