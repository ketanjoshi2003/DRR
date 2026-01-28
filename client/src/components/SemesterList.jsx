import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Upload, Book, Filter, Calendar, Trash2 } from 'lucide-react';
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

    const handleDeleteAllSemesters = async () => {
        if (!window.confirm('Are you sure you want to delete ALL semesters? This action cannot be undone.')) {
            return;
        }
        try {
            await api.delete('/semesters');
            alert('All semesters deleted successfully.');
            fetchData();
        } catch (error) {
            console.error('Error deleting semesters:', error);
            alert('Failed to delete semesters');
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

    const filteredSemesters = selectedCourse === 'all'
        ? semesters
        : semesters.filter(s => s.course?._id === selectedCourse);

    if (loading) return <div>Loading semesters...</div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">Semesters</h1>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm text-gray-700 min-w-[150px]"
                        >
                            <option value="all">All Courses</option>
                            {courses.map(c => (
                                <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                            ))}
                        </select>
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
                                onClick={handleDeleteAllSemesters}
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
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Semester
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSemesters.map((semester) => (
                    <div key={semester._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Calendar className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                                    {semester.course?.code || 'Unknown Course'}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded-full">
                                    {semester.code}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{semester.name}</h3>
                            <p className="text-gray-600 text-sm line-clamp-3">
                                {semester.description || 'No description available.'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {filteredSemesters.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No semesters found for the selected criteria.</p>
                </div>
            )}

            {/* Add Semester Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">Add New Semester</h2>
                        <form onSubmit={handleAddSemester}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
                                    <select
                                        required
                                        value={newSemester.courseId}
                                        onChange={(e) => setNewSemester({ ...newSemester, courseId: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    >
                                        <option value="">-- Select Course --</option>
                                        {courses.map(c => (
                                            <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSemester.name}
                                        onChange={(e) => setNewSemester({ ...newSemester, name: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSemester.code}
                                        onChange={(e) => setNewSemester({ ...newSemester, code: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={newSemester.description}
                                        onChange={(e) => setNewSemester({ ...newSemester, description: e.target.value })}
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
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
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
