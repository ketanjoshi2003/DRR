import { useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import { Upload, X, CheckCircle, AlertCircle, FileText, Loader } from 'lucide-react';

const BulkUpload = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

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

    // Handle drop
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.type === 'application/pdf'
        );

        if (droppedFiles.length > 0) {
            setFiles(prev => [...prev, ...droppedFiles]);
        }
    }, []);

    // Handle file input change
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files).filter(
            file => file.type === 'application/pdf'
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

            // If it's a 404, it means the server hasn't been restarted
            if (error.response?.status === 404) {
                alert('Server endpoint not found. Please restart your backend server to apply changes.');
            }

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
                <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
                <p className="text-sm text-gray-600 mt-1">
                    Drag and drop PDF files here. Automatic metadata extraction and OCR included.
                </p>
            </div>

            {/* Drag and Drop Zone */}
            <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${dragActive
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <Upload className={`h-16 w-16 ${dragActive ? 'text-brand-500' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="text-lg font-medium text-gray-900">
                            {dragActive ? 'Drop files here' : 'Drag and drop PDF files'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">or</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Select Files
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <p className="text-xs text-gray-500">
                        Support for PDF files up to 50MB each. Maximum 20 files at once.
                    </p>
                </div>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                            Selected Files ({files.length})
                        </h3>
                        <button
                            onClick={() => setFiles([])}
                            className="text-sm text-gray-600 hover:text-gray-900"
                        >
                            Clear All
                        </button>
                    </div>
                    <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                        {files.map((file, index) => (
                            <li key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="ml-4 flex-shrink-0 text-gray-400 hover:text-red-500"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <button
                            onClick={handleBulkUpload}
                            disabled={uploading}
                            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${uploading ? 'opacity-50 cursor-not-allowed' : ''
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
                <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Upload Results</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Summary */}
                        <div className="flex items-center gap-4 pb-4 border-b">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium text-gray-900">
                                        {uploadResults.successful.length} Successful
                                    </span>
                                </div>
                            </div>
                            {uploadResults.failed.length > 0 && (
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                        <span className="text-sm font-medium text-gray-900">
                                            {uploadResults.failed.length} Failed
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Successful Uploads */}
                        {uploadResults.successful.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-green-700 mb-2">Successfully Uploaded</h4>
                                <ul className="space-y-2">
                                    {uploadResults.successful.map((result, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm p-2 bg-green-50 rounded">
                                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900">{result.title}</p>
                                                <p className="text-xs text-gray-600 truncate">
                                                    Original: {result.originalName}
                                                    {result.processed && (
                                                        <span className="ml-2 text-green-600">
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
                                <h4 className="text-sm font-medium text-red-700 mb-2">Failed Uploads</h4>
                                <ul className="space-y-2">
                                    {uploadResults.failed.map((result, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm p-2 bg-red-50 rounded">
                                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900">{result.originalName}</p>
                                                <p className="text-xs text-red-600">{result.error}</p>
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
