import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api/axios';
import { Upload, X, CheckCircle, AlertCircle, FileText, Loader, GraduationCap, Book, ChevronDown } from 'lucide-react';
import CustomSelect from './CustomSelect';

const BulkUpload = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const fileInputRef = useRef(null);

    // Fetch assignment options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [coursesRes, subjectsRes] = await Promise.all([
                    api.get('/courses'),
                    api.get('/subjects')
                ]);
                setCourses(coursesRes.data);
                setSubjects(subjectsRes.data);
            } catch (err) {
                console.error('Failed to fetch assignment options', err);
            }
        };
        fetchOptions();
    }, []);

    // Handle drag events
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const allowedTypes = [
            'application/pdf',
            'application/epub+zip',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'audio/mpeg',
            'video/mp4'
        ];

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => allowedTypes.includes(file.type)
        );

        if (droppedFiles.length > 0) {
            setFiles(prev => [...prev, ...droppedFiles]);
        }
    }, []);

    // Handle file input change
    const handleFileChange = (e) => {
        const allowedTypes = [
            'application/pdf',
            'application/epub+zip',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'audio/mpeg',
            'video/mp4'
        ];
        const selectedFiles = Array.from(e.target.files).filter(
            file => allowedTypes.includes(file.type)
        );
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    // Remove file from list
    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Handle bulk upload
    const handleBulkUpload = async () => {
        if (files.length === 0) {
            return;
        }

        setUploading(true);
        setUploadResults(null);

        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        // Default settings without the batch settings UI
        formData.append('accessControl', JSON.stringify({
            isProtected: false,
            allowDownload: true,
            viewOnly: false
        }));

        if (selectedCourse) formData.append('courseCode', selectedCourse);
        if (selectedSubject) formData.append('subjectCode', selectedSubject);

        try {
            const { data } = await api.post('/pdfs/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`Upload Progress: ${percentCompleted}%`);
                }
            });

            setUploadResults(data.results);
            setFiles([]); // Clear files on success
        } catch (error) {
            console.error('Bulk upload error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Upload failed';

            setUploadResults({
                successful: [],
                failed: files.map(f => ({ originalName: f.name, error: errorMessage }))
            });
        } finally {
            setUploading(false);
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Upload Documents</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors">
                    Drag and drop files here. Automatic metadata extraction and OCR included.
                </p>
            </div>

            {/* Drag and Drop Zone */}
            <div
                className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-150 ${dragActive
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-gray-300 dark:border-zinc-800 hover:border-gray-400 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950/50'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <Upload className={`h-16 w-16 transition-colors duration-150 ${dragActive ? 'text-brand-500' : 'text-gray-400 dark:text-zinc-600'}`} />
                    </div>
                    <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 transition-colors">
                            {dragActive ? 'Drop files here' : 'Drag and drop files'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">or</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-6 py-2.5 border border-gray-300 dark:border-zinc-800 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Select Files
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.epub,.doc,.docx,.jpg,.png,.mp4,.mp3"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <p className="text-xs text-gray-500 dark:text-zinc-500 transition-colors">
                        Support for PDF, EPUB, DOC, Images, Audio, and Video files up to 50MB each.
                    </p>
                </div>
            </div>

            {/* Global Assignments for this batch */}
            <div className="mt-8 p-8 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">Batch Classification</h3>
                        <p className="text-[10px] text-gray-500 dark:text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Link these files to a specific syllabus</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Select Course</label>
                        <CustomSelect
                            options={[{ value: '', label: 'No Course Assigned' }, ...courses.map(c => ({ value: c.code, label: `${c.name} — ${c.code}` }))]}
                            value={selectedCourse}
                            onChange={(val) => {
                                setSelectedCourse(val);
                                setSelectedSubject(''); // Reset subject when course changes
                            }}
                            icon={GraduationCap}
                            placeholder="Search or Select Course"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Select Subject</label>
                        <CustomSelect
                            options={[{ value: '', label: 'No Subject Assigned' }, ...subjects
                                .filter(s => !selectedCourse || s.courseCode === selectedCourse)
                                .map(s => ({ value: s.code, label: `${s.name} — ${s.code}` }))
                            ]}
                            value={selectedSubject}
                            onChange={setSelectedSubject}
                            icon={Book}
                            placeholder="Search or Select Subject"
                        />
                    </div>
                </div>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
                <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Selected Files ({files.length})
                        </h3>
                        <button
                            onClick={() => setFiles([])}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    <ul className="divide-y divide-gray-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
                        {files.map((file, index) => (
                            <li key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <FileText className="h-5 w-5 text-gray-400 dark:text-zinc-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-500">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="ml-4 flex-shrink-0 text-gray-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-zinc-800">
                        <button
                            onClick={handleBulkUpload}
                            disabled={uploading}
                            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 shadow-brand-500/10 ${uploading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {uploading ? (
                                <>
                                    <Loader className="animate-spin h-5 w-5 mr-2" />
                                    Processing {files.length} file{files.length !== 1 ? 's' : ''}...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-5 w-5 mr-2" />
                                    Upload {files.length} file{files.length !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
                <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Upload Results</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Summary */}
                        <div className="flex items-center gap-4 pb-4 border-b dark:border-zinc-800">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {uploadResults.successful.length} Successful
                                    </span>
                                </div>
                            </div>
                            {uploadResults.failed.length > 0 && (
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {uploadResults.failed.length} Failed
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Successful Uploads */}
                        {uploadResults.successful.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Successfully Uploaded</h4>
                                <ul className="space-y-2">
                                    {uploadResults.successful.map((result, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm p-3 bg-green-50 dark:bg-green-900/10 rounded-lg transition-colors border border-green-100 dark:border-green-900/20">
                                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{result.title}</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                    Original: {result.originalName}
                                                    {result.processed && (
                                                        <span className="ml-2 text-green-600 dark:text-green-400">
                                                            • Metadata extracted
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Failed Uploads */}
                        {uploadResults.failed.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Failed Uploads</h4>
                                <ul className="space-y-2">
                                    {uploadResults.failed.map((result, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm p-3 bg-red-50 dark:bg-red-900/10 rounded-lg transition-colors border border-red-100 dark:border-red-900/20">
                                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{result.originalName}</p>
                                                <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUpload;
