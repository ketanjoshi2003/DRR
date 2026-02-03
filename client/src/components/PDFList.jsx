import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { FileText, Clock, Trash2, Search, Info, Image as ImageIcon, Film, FileAudio, File, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PDFList = () => {
    // ... stats ...
    const getFileIcon = (type, name) => {
        let t = type;
        const ext = name?.toLowerCase() || '';

        // If type is 'other' or missing, try extension check
        if (!t || t === 'other') {
            if (ext.endsWith('.pdf')) t = 'pdf';
            else if (ext.match(/\.(png|jpg|jpeg|gif|webp)$/)) t = 'image';
            else if (ext.match(/\.(mp4|webm)$/)) t = 'video';
            else if (ext.match(/\.(mp3|wav)$/)) t = 'audio';
        }

        switch (t) {
            case 'pdf': return <FileText className="w-8 h-8 text-brand-600" />;
            case 'image': return <ImageIcon className="w-8 h-8 text-blue-600" />;
            case 'video': return <Film className="w-8 h-8 text-purple-600" />;
            case 'audio': return <FileAudio className="w-8 h-8 text-amber-600" />;
            default: return <File className="w-8 h-8 text-gray-600" />;
        }
    };

    const getIconBg = (type, name) => {
        let t = type;
        const ext = name?.toLowerCase() || '';

        if (!t || t === 'other') {
            if (ext.endsWith('.pdf')) t = 'pdf';
            else if (ext.match(/\.(png|jpg|jpeg|gif|webp)$/)) t = 'image';
            else if (ext.match(/\.(mp4|webm)$/)) t = 'video';
            else if (ext.match(/\.(mp3|wav)$/)) t = 'audio';
        }

        switch (t) {
            case 'pdf': return 'bg-brand-50';
            case 'image': return 'bg-blue-50';
            case 'video': return 'bg-purple-50';
            case 'audio': return 'bg-amber-50';
            default: return 'bg-gray-50';
        }
    };

    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();
    const [selectedPdfForInfo, setSelectedPdfForInfo] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);


    const fetchPdfs = async () => {
        try {
            const { data } = await api.get('/pdfs');
            setPdfs(data);
        } catch (error) {
            console.error('Error fetching PDFs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPdfs();
    }, []);

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} PDFs? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.delete('/pdfs', { data: { ids: selectedIds } });
            alert('Selected PDFs deleted successfully.');
            setSelectedIds([]);
            setIsDeleteMode(false);
            fetchPdfs();
        } catch (error) {
            console.error('Error deleting PDFs:', error);
            alert('Failed to delete PDFs');
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredPdfs = pdfs.filter(pdf => {
        const matchesSearch =
            (pdf.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (pdf.metadata?.author?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (pdf.metadata?.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (pdf.metadata?.keywords?.toLowerCase() || '').includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    const handleSelectAll = () => {
        if (selectedIds.length === filteredPdfs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredPdfs.map(p => p._id));
        }
    };

    if (loading) return (
        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium animate-pulse">Loading library...</p>
        </div>
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Digital Library</h1>

                <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search PDFs..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-md leading-5 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>



                    {user?.role === 'admin' && (
                        <div className="flex flex-wrap gap-3 items-center">
                            {!isDeleteMode ? (
                                <button
                                    onClick={() => setIsDeleteMode(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSelectAll}
                                        className="px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm"
                                    >
                                        {selectedIds.length === filteredPdfs.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <button
                                        onClick={handleDeleteSelected}
                                        disabled={selectedIds.length === 0}
                                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                                    >
                                        Delete ({selectedIds.length})
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsDeleteMode(false);
                                            setSelectedIds([]);
                                        }}
                                        className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
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
                {filteredPdfs.map((pdf) => (
                    <div
                        key={pdf._id}
                        className={`bg-white dark:bg-zinc-950 rounded-xl border p-6 transition-all duration-150 transform-gpu relative overflow-hidden flex flex-col h-full ${isDeleteMode
                            ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/50'
                            : 'border-gray-200 dark:border-zinc-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg dark:hover:shadow-brand-500/10 hover:-translate-y-1'
                            } ${selectedIds.includes(pdf._id) ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20' : ''}`}
                        onClick={() => isDeleteMode && toggleSelection(pdf._id)}
                    >
                        {isDeleteMode && (
                            <div className="absolute top-4 right-4 z-10">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(pdf._id)}
                                    onChange={() => toggleSelection(pdf._id)}
                                    className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()} // Prevent double toggle
                                />
                            </div>
                        )}

                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div className={`p-3 rounded-lg ${getIconBg(pdf.type, pdf.originalName)}`}>
                                    {getFileIcon(pdf.type, pdf.originalName)}
                                </div>
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100 truncate" title={pdf.title}>
                                {pdf.title}
                            </h3>

                            {/* Metadata Display */}
                            <div className="mt-2 space-y-1">
                                {pdf.metadata?.author && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                                        by {pdf.metadata.author}
                                    </p>
                                )}
                                {pdf.metadata?.subject && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={pdf.metadata.subject}>
                                        {pdf.metadata.subject}
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {/* File Info Badges */}
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200">
                                    {(pdf.size / 1024 / 1024).toFixed(1)} MB
                                </span>

                                {pdf.numPages > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200">
                                        {pdf.numPages} p
                                    </span>
                                )}

                                {/* Feature Badges */}
                                {pdf.isSearchable && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" title="Text is searchable">
                                        {pdf.ocrText ? 'OCR' : 'Text'}
                                    </span>
                                )}




                            </div>

                            <div className="mt-2 flex items-center text-xs text-gray-400 dark:text-gray-500 gap-2">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(pdf.createdAt).toLocaleDateString()}
                                </span>
                                <span className="text-gray-300 dark:text-zinc-800">|</span>
                                <span>Up: {pdf.uploadedBy?.name || 'Admin'}</span>
                            </div>

                            {(() => {
                                const name = pdf.originalName?.toLowerCase() || '';
                                const isPdf = name.endsWith('.pdf') || pdf.type === 'pdf';
                                const isImage = name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || pdf.type === 'image';

                                if (!isDeleteMode) {
                                    if (isPdf && !isImage) {
                                        return (
                                            <Link
                                                to={`/read/${pdf._id}`}
                                                className="mt-4 w-full block text-center py-2 px-4 border border-brand-600 dark:border-brand-500 rounded-lg text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                                            >
                                                Read Now
                                            </Link>
                                        );
                                    } else if (isImage) {
                                        return (
                                            <Link
                                                to={`/view-image/${pdf._id}`}
                                                className="mt-4 w-full block text-center py-2 px-4 border border-blue-600 dark:border-blue-500 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                            >
                                                View Image
                                            </Link>
                                        );
                                    } else if (name.endsWith('.docx')) {
                                        return (
                                            <Link
                                                to={`/view-document/${pdf._id}`}
                                                className="mt-4 w-full block text-center py-2 px-4 border border-blue-600 dark:border-blue-500 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                            >
                                                View Document
                                            </Link>
                                        );
                                    } else {
                                        return (
                                            <button
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    try {
                                                        const response = await api.get(`/pdfs/${pdf._id}/stream?download=true`, {
                                                            responseType: 'blob',
                                                        });
                                                        const url = window.URL.createObjectURL(new Blob([response.data]));
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.setAttribute('download', pdf.originalName || `${pdf.title}`);
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        link.remove();
                                                        window.URL.revokeObjectURL(url);
                                                    } catch (error) {
                                                        console.error('Download failed:', error);
                                                        alert('Failed to download file');
                                                    }
                                                }}
                                                className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download File
                                            </button>
                                        );
                                    }
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                ))}
            </div>
            {pdfs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No PDFs available. Ask an admin to upload some.
                </div>
            )}

        </div>
    );
};

export default PDFList;
