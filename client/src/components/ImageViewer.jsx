import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ChevronLeft, Maximize, Minimize, Info, ZoomIn, ZoomOut, Download, X } from 'lucide-react';
import MetadataModal from './MetadataModal';

const ImageViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pdfMeta, setPdfMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scale, setScale] = useState(1);
    const [showInfo, setShowInfo] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const fetchImage = async () => {
            try {
                // 1. Fetch Metadata
                const { data: meta } = await api.get(`/pdfs/${id}`);
                setPdfMeta(meta);

                // 2. Fetch Image Blob
                const response = await api.get(`/pdfs/${id}/stream`, {
                    responseType: 'blob'
                });

                const blob = response.data;

                // Check if it's an error JSON disguised as a blob
                if (blob.type === 'application/json' || (blob.type === 'text/plain' && blob.size < 500)) {
                    const text = await blob.text();
                    try {
                        const json = JSON.parse(text);
                        setError(json.message || 'Server error while loading image');
                        setLoading(false);
                        return;
                    } catch (e) {
                        // Not JSON, continue
                    }
                }

                // FIX: Use 'meta' instead of 'pdfMeta' here
                const name = meta.originalName?.toLowerCase() || '';
                const isImageMime = blob.type.startsWith('image/');
                const isImageExt = ['.png', '.jpg', '.jpeg', '.gif'].some(ext => name.endsWith(ext));

                if (!isImageMime && !isImageExt) {
                    setError('The requested file is not a supported image format.');
                    setLoading(false);
                    return;
                }

                const url = URL.createObjectURL(blob);
                setImageUrl(url);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load image', err);
                let errorMessage = 'Failed to load image';

                if (err.response?.data instanceof Blob) {
                    const text = await err.response.data.text();
                    try {
                        const json = JSON.parse(text);
                        errorMessage = json.message || errorMessage;
                    } catch (e) {
                        errorMessage = text || errorMessage;
                    }
                } else if (err.response?.data?.message) {
                    errorMessage = err.response.data.message;
                }

                setError(errorMessage);
                setLoading(false);
            }
        };

        if (id) fetchImage();

        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [id]);

    const handleDownload = () => {
        if (!imageUrl || !pdfMeta) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = pdfMeta.originalName || 'image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
            <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Loading Image...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4 text-center">
            <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 max-w-md">
                <h2 className="text-xl font-bold mb-2">Error</h2>
                <p>{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    Back to Library
                </button>
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col h-screen ${isFullScreen ? 'bg-black' : 'bg-gray-100'}`}>
            {/* Toolbar */}
            <div className={`px-6 py-3 flex items-center justify-between z-50 transition-colors ${isFullScreen ? 'bg-black/50 border-white/10' : 'bg-white border-b border-gray-200'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className={`p-2 rounded-lg transition-colors ${isFullScreen ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className={`text-sm font-bold truncate max-w-[200px] ${isFullScreen ? 'text-white' : 'text-gray-900'}`}>
                            {pdfMeta?.title}
                        </h1>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Image Viewer</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 p-1 rounded-lg ${isFullScreen ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <button
                            onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
                            className={`p-1.5 rounded-md transition-colors ${isFullScreen ? 'text-white hover:bg-white/20' : 'text-gray-600 hover:bg-white shadow-sm'}`}
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setScale(1)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight transition-colors ${isFullScreen ? 'text-white hover:bg-white/20' : 'text-gray-600 hover:bg-white shadow-sm'}`}
                            title="Reset Zoom"
                        >
                            {Math.round(scale * 100)}%
                        </button>
                        <button
                            onClick={() => setScale(s => Math.min(5, s + 0.1))}
                            className={`p-1.5 rounded-md transition-colors ${isFullScreen ? 'text-white hover:bg-white/20' : 'text-gray-600 hover:bg-white shadow-sm'}`}
                            title="Zoom In"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-gray-200 mx-2" />

                    <button
                        onClick={() => setShowInfo(true)}
                        className={`p-2 rounded-lg transition-colors ${isFullScreen ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                        title="Image Info"
                    >
                        <Info className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleDownload}
                        className={`p-2 rounded-lg transition-colors ${isFullScreen ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                        title="Download"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-auto flex items-center justify-center p-4 md:p-12 ${isFullScreen ? 'bg-zinc-950' : 'bg-gray-100'}`}>
                <div
                    className="relative transition-transform duration-200 ease-out origin-center"
                    style={{ transform: `scale(${scale})` }}
                >
                    <img
                        src={imageUrl}
                        alt={pdfMeta?.title}
                        className="max-w-full h-auto shadow-2xl rounded-lg bg-white"
                        style={{
                            maxHeight: 'calc(100vh - 160px)',
                            objectFit: 'contain'
                        }}
                    />
                </div>
            </div>

            {/* Info Modal */}
            <MetadataModal
                pdf={pdfMeta}
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
            />
        </div>
    );
};

export default ImageViewer;
