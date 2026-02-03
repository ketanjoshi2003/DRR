import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    Loader, ChevronLeft, Download, AlertCircle, Maximize, Minimize,
    ZoomIn, ZoomOut, Sun, Moon, Info
} from 'lucide-react';
import MetadataModal from './MetadataModal';

const DocViewer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useAuth();
    const containerRef = useRef(null);
    const viewerRef = useRef(null); // Ref for the main scrolling container
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [scale, setScale] = useState(window.innerWidth < 768 ? ((window.innerWidth - 32) / 850) * 100 : 100); // Percentage
    const [showInfo, setShowInfo] = useState(false);
    const [sessionId, setSessionId] = useState(null);

    // Reading Session Analytics
    useEffect(() => {
        let heartbeatInterval;

        const startSession = async () => {
            try {
                const { data } = await api.post('/analytics/session/start', { pdfId: id });
                setSessionId(data._id);

                // Start duration heartbeat every 30 seconds
                heartbeatInterval = setInterval(async () => {
                    try {
                        await api.post('/analytics/session/update', {
                            sessionId: data._id,
                            duration: 30
                        });
                    } catch (err) {
                        console.error('Heartbeat failed', err);
                    }
                }, 30000);
            } catch (err) {
                console.error('Failed to start session', err);
            }
        };

        if (id && !loading && !error) {
            startSession();
        }

        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [id, loading, error]);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                setLoading(true);
                // 1. Fetch Metadata
                const { data: metaData } = await api.get(`/pdfs/${id}`);
                setMeta(metaData);

                // 2. Fetch Blob
                const response = await api.get(`/pdfs/${id}/stream`, {
                    responseType: 'blob'
                });

                if (containerRef.current) {
                    // Clear previous content
                    containerRef.current.innerHTML = '';

                    // Render using docx-preview
                    await renderAsync(response.data, containerRef.current, containerRef.current, {
                        className: 'docx-viewer-content',
                        inWrapper: true,
                        ignoreWidth: false,
                        ignoreHeight: false,
                        ignoreFonts: false,
                        breakPages: true,
                        ignoreLastRenderedPageBreak: true,
                        experimental: false,
                        trimXmlDeclaration: true,
                        useBase64URL: false,
                        useMathMLPolyfill: false,
                        debug: false,
                    });
                }
            } catch (err) {
                console.error('Error loading document:', err);
                setError(err.message || 'Failed to load document');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDoc();
        }
    }, [id]);

    // Handle container resize for fluid responsiveness
    useEffect(() => {
        if (!viewerRef.current) return;

        const handleResize = (entries) => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                // Subtract padding (p-4 = 32px, md:p-8 = 64px)
                const padding = window.innerWidth < 768 ? 32 : 64;
                const availableWidth = width - padding;

                // Doc base width is 850px (standard A4 with margins)
                if (availableWidth < 850) {
                    const newScale = (availableWidth / 850) * 100;
                    setScale(Math.floor(newScale));
                } else {
                    setScale(100); // Fit 1:1 if it fits
                }
            }
        };

        const observer = new ResizeObserver(handleResize);
        observer.observe(viewerRef.current);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const rootRef = useRef(null);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            if (rootRef.current) {
                rootRef.current.requestFullscreen().then(() => setIsFullScreen(true));
            }
        } else {
            document.exitFullscreen().then(() => setIsFullScreen(false));
        }
    };

    const handleDownload = async () => {
        if (!meta) return;
        try {
            const response = await api.get(`/pdfs/${id}/stream?download=true`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', meta.originalName || meta.title);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download file');
        }
    };

    return (
        <div ref={rootRef} className={`flex flex-col h-screen overflow-hidden transition-colors duration-200 ease-in-out bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}>

            <div
                ref={viewerRef}
                className="flex-1 flex flex-col items-center relative overflow-auto custom-scrollbar w-full"
            >

                {/* Floating Toolbar - Mimicking PDFReader */}
                <div className={`sticky top-2 md:top-6 z-50 transition-all duration-150 ${isFullScreen ? 'w-auto' : 'w-full max-w-5xl'}`}>
                    <div className="mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-1.5 md:p-2 flex items-center justify-between gap-2 md:gap-6 w-fit max-w-[98vw] shadow-lg dark:shadow-brand-500/5 transition-colors">

                        <button
                            onClick={() => navigate('/')}
                            className="text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium text-sm flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group"
                        >
                            <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
                            <span className="hidden lg:inline">Library</span>
                        </button>

                        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                        {/* Controls Group */}
                        <div className="flex items-center gap-1 md:gap-2">
                            {/* Zoom Control */}
                            <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 rounded-md p-1">
                                <button
                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-zinc-700 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-gray-500 dark:text-gray-400"
                                    onClick={() => setScale(s => Math.max(50, s - 10))}
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="text-[10px] md:text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[2.5rem] md:min-w-[3.5rem] text-center select-none font-mono tabular-nums">
                                    {scale}%
                                </span>
                                <button
                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-zinc-700 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-gray-500 dark:text-gray-400"
                                    onClick={() => setScale(s => Math.min(200, s + 10))}
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                        <div className="flex items-center gap-1 md:gap-2">
                            <button
                                onClick={toggleTheme}
                                title={isDarkMode ? "Light Mode" : "Dark Mode"}
                                className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                            >
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>

                            <button
                                className={`p-2 rounded-md transition-colors ${showInfo ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-brand-600 dark:hover:text-brand-400'}`}
                                onClick={() => setShowInfo(true)}
                                title="Document Info"
                            >
                                <Info className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleDownload}
                                className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                title="Download"
                            >
                                <Download className="w-5 h-5" />
                            </button>

                            <button
                                className="p-2 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                onClick={toggleFullScreen}
                                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                            >
                                {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className={`flex-1 w-full flex justify-center p-4 md:p-8 overflow-visible ${isDarkMode ? 'dark-mode-doc' : ''}`}>
                    <div
                        className={`bg-transparent relative transition-all duration-200 ease-linear ${loading ? 'opacity-0' : 'opacity-100'}`}
                        style={{
                            transform: `scale(${scale / 100})`,
                            transformOrigin: 'top center',
                            minHeight: '1000px',
                            width: '850px' // Initial base width for A4-ish feel
                        }}
                    >
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/80 backdrop-blur-sm">
                                <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4" />
                                <span className="text-gray-500 font-medium">Loading Document...</span>
                            </div>
                        )}

                        {error && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
                                <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md">
                                    <AlertCircle className="w-12 h-12 text-red-500" />
                                    <h3 className="text-lg font-medium text-gray-900">Unable to View Document</h3>
                                    <p className="text-sm text-gray-500">{error}</p>
                                    <button
                                        onClick={handleDownload}
                                        className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                                    >
                                        Download Instead
                                    </button>
                                </div>
                            </div>
                        )}

                        <div
                            ref={containerRef}
                            className="docx-preview-wrapper"
                        >
                            {/* DOCX Content will be rendered here */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Modal */}
            <MetadataModal
                pdf={meta}
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
                onUpdate={(updatedPdf) => setMeta(updatedPdf)}
            />

            <style>{`
                .docx-wrapper { background: transparent !important; padding: 0 !important; }
                .docx-viewer-content { padding: 0 !important; }
                .docx-viewer-content section { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important; margin-bottom: 2rem !important; }
                /* Dark Mode Inversion for Document Content */
                .dark-mode-doc .docx-preview-wrapper {
                    filter: invert(1) hue-rotate(180deg);
                }
                .dark-mode-doc img {
                    filter: invert(1) hue-rotate(180deg); /* Revert images */
                }
            `}</style>
        </div>
    );
};

export default DocViewer;
