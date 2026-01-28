import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api/axios';
import { ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const PDFReader = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [sessionId, setSessionId] = useState(null);
    const [scale, setScale] = useState(1.0);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const sessionRef = useRef(null);
    const startTimeRef = useRef(Date.now());

    // Initialize session
    useEffect(() => {
        const startSession = async () => {
            try {
                const { data } = await api.post('/analytics/session/start', { pdfId: id });
                setSessionId(data._id);
                sessionRef.current = data._id;
            } catch (error) {
                console.error('Failed to start session', error);
                setError('Failed to initialize reading session');
            }
        };

        if (id) startSession();

        return () => {
            // End session cleanup if needed
            // Note: browser close/refresh is hard to catch reliably, 
            // but component unmount works for navigation
            // We rely on heartbeat updates for final stats basically.
        };
    }, [id]);

    const pageNumberRef = useRef(pageNumber);

    // Keep ref in sync
    useEffect(() => {
        pageNumberRef.current = pageNumber;
        // We do NOT reset startTimeRef here anymore to avoid fragmenting time excessively
        // or we can keep it if we want per-page granularity, but for "any changes" fix,
        // we mainly need the interval to RUN.
        // Let's keep it simple: just track total session time flow.
    }, [pageNumber]);

    // Tracking heartbeat and page duration
    useEffect(() => {
        if (!sessionId) return;

        const interval = setInterval(async () => {
            const now = Date.now();
            const duration = (now - startTimeRef.current) / 1000; // seconds since last update
            startTimeRef.current = now; // reset window

            try {
                await api.post('/analytics/session/update', {
                    sessionId,
                    pageNumber: pageNumberRef.current, // Use ref to get latest without resetting interval
                    duration
                });
            } catch (err) {
                console.error('Tracking failed', err);
            }
        }, 5000); // 5 second heartbeat

        return () => clearInterval(interval);
    }, [sessionId]); // Only restart if sessionId changes

    // Refs for pages to scroll to them
    const pageRefs = useRef({});

    // Observe which page is currently in view
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const pageNum = parseInt(entry.target.getAttribute('data-page-number'));
                        setPageNumber(pageNum);
                    }
                });
            },
            {
                root: containerRef.current,
                threshold: 0.5 // Trigger when 50% of page is visible
            }
        );

        // Observe all page elements
        Object.values(pageRefs.current).forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [numPages, loading]); // Re-run when pages are loaded

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setLoading(false);
    };

    const changePage = (offset) => {
        const newPage = pageNumber + offset;
        if (newPage >= 1 && newPage <= numPages) {
            setPageNumber(newPage);
            const pageEl = pageRefs.current[newPage];
            if (pageEl) {
                pageEl.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    const previousPage = () => changePage(-1);
    const nextPage = () => changePage(1);

    // Secure fetch of PDF
    // React-pdf can take a URL with headers.
    const fileUrl = {
        url: `http://localhost:5000/api/pdfs/${id}/stream`,
        httpHeaders: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    };

    if (error) return <div className="text-red-500 p-8">{error}</div>;

    const containerRef = useRef(null);

    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            if (containerRef.current) {
                containerRef.current.requestFullscreen().then(() => setIsFullScreen(true));
            }
        } else {
            document.exitFullscreen().then(() => setIsFullScreen(false));
        }
    };

    // Update state if user presses Esc
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    return (
        <div
            ref={containerRef}
            className="flex flex-col items-center min-h-screen bg-gray-100 p-4 select-none overflow-auto"
        >
            {/* Toolbar */}
            <div className="sticky top-4 z-10 bg-white p-4 rounded-lg shadow-md mb-6 flex items-center justify-between gap-4 w-full max-w-4xl">
                <button
                    onClick={() => navigate('/')}
                    className="text-gray-600 hover:text-gray-900 font-medium"
                >
                    Back to Library
                </button>

                <div className="flex items-center gap-4">
                    <button
                        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                        disabled={pageNumber <= 1}
                        onClick={previousPage}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-medium">
                        Page {pageNumber} of {numPages || '--'}
                    </span>
                    <button
                        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                        disabled={pageNumber >= numPages}
                        onClick={nextPage}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="p-2 rounded-full hover:bg-gray-100"
                        onClick={toggleFullScreen}
                        title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    >
                        {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Reader */}
            <div
                className="bg-gray-100 min-h-[600px] flex justify-center p-4 relative w-full"
                onContextMenu={(e) => e.preventDefault()}
            >
                {loading && <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50">Loading PDF...</div>}
                <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) => setError('Failed to load PDF. ' + err.message)}
                    loading={<div className="h-96 w-64 flex items-center justify-center">Loading...</div>}
                    className="flex flex-col items-center gap-8"
                >
                    {Array.from(new Array(numPages), (el, index) => (
                        <div
                            key={`page_${index + 1}`}
                            ref={(el) => (pageRefs.current[index + 1] = el)}
                            data-page-number={index + 1}
                            className="bg-white shadow-lg"
                        >
                            <Page
                                pageNumber={index + 1}
                                scale={scale}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                className="shadow-sm"
                                loading={<div className="h-[800px] w-[600px] bg-white animate-pulse" />}
                            />
                        </div>
                    ))}
                </Document>
            </div>

            <div className="mt-4 text-xs text-gray-400">
                Secure Viewer - Session ID: {sessionId}
            </div>
        </div>
    );
};

export default PDFReader;
