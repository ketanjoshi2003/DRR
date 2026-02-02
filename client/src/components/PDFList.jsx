import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { FileText, Clock, Trash2, Search, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MetadataModal from './MetadataModal';

const PDFList = () => {
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

    const filteredPdfs = pdfs.filter(pdf =>
        pdf.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectAll = () => {
        if (selectedIds.length === filteredPdfs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredPdfs.map(p => p._id));
        }
    };

    if (loading) return <div>Loading library...</div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">Digital Library</h1>

                <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search PDFs..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
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
                        className={`bg-white rounded-xl border p-6 transition-all duration-300 transform-gpu relative overflow-hidden flex flex-col h-full ${isDeleteMode
                            ? 'cursor-pointer hover:bg-red-50 border-red-200'
                            : 'border-gray-200 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1'
                            } ${selectedIds.includes(pdf._id) ? 'ring-2 ring-red-500 bg-red-50' : ''}`}
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
                                <div className="p-3 bg-brand-50 rounded-lg">
                                    <FileText className="w-8 h-8 text-brand-600" />
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPdfForInfo(pdf);
                                        setShowInfoModal(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all"
                                    title="View Info"
                                >
                                    <Info className="w-5 h-5" />
                                </button>
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-gray-900 truncate" title={pdf.title}>
                                {pdf.title}
                            </h3>

                            {/* Metadata Display */}
                            <div className="mt-2 space-y-1">
                                {pdf.metadata?.author && (
                                    <p className="text-sm text-gray-700 font-medium truncate">
                                        by {pdf.metadata.author}
                                    </p>
                                )}
                                {pdf.metadata?.subject && (
                                    <p className="text-xs text-gray-500 truncate" title={pdf.metadata.subject}>
                                        {pdf.metadata.subject}
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {/* File Info Badges */}
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {(pdf.size / 1024 / 1024).toFixed(1)} MB
                                </span>

                                {pdf.numPages > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {pdf.numPages} p
                                    </span>
                                )}

                                {/* Feature Badges */}
                                {pdf.isSearchable && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Text is searchable">
                                        {pdf.ocrText ? 'OCR' : 'Text'}
                                    </span>
                                )}
                            </div>

                            <div className="mt-2 flex items-center text-xs text-gray-400 gap-2">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(pdf.createdAt).toLocaleDateString()}
                                </span>
                                <span className="text-gray-300">|</span>
                                <span>Up: {pdf.uploadedBy?.name || 'Admin'}</span>
                            </div>

                            {!isDeleteMode && (
                                <Link
                                    to={`/read/${pdf._id}`}
                                    className="mt-4 w-full block text-center py-2 px-4 border border-brand-600 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                                >
                                    Read Now
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {pdfs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No PDFs available. Ask an admin to upload some.
                </div>
            )}

            <MetadataModal
                pdf={selectedPdfForInfo}
                isOpen={showInfoModal}
                onClose={() => {
                    setShowInfoModal(false);
                    setSelectedPdfForInfo(null);
                }}
                onUpdate={(updatedPdf) => {
                    setPdfs(pdfs.map(p => p._id === updatedPdf._id ? updatedPdf : p));
                    setSelectedPdfForInfo(updatedPdf);
                }}
            />
        </div>
    );
};

export default PDFList;
