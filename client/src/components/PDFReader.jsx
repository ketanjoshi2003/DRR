import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Maximize, Minimize, MessageSquare, Plus, X, Trash2, ZoomIn, ZoomOut, Info, CheckCircle, Search, Moon, Sun } from 'lucide-react';
import MetadataModal from './MetadataModal';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

// Memoized Page Component
const PageContent = memo(({ pageNumber, scale, notes }) => {
    const textRenderer = useCallback(({ str }) => {
        if (!str) return str;

        const isHighlighted = notes.some(n => {
            if (n.pageNumber !== pageNumber) return false;

            // Ultra-Fuzzy Matching: Strip everything except alphanumeric, then fuzzy match i/l/1
            // This handles spacing, punctuation (hyphens), and OCR errors
            const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const fuzzy = (s) => clean(s).replace(/[l1]/g, 'i');

            const noteFuzzy = fuzzy(n.selectedText);
            const strFuzzy = fuzzy(str);

            return strFuzzy.length > 0 && noteFuzzy.includes(strFuzzy);
        });

        if (isHighlighted) {
            return (
                <mark className="bg-yellow-300 mix-blend-multiply text-transparent rounded-[2px]" title="Note available">
                    {str}
                </mark>
            );
        }
        return str;
    }, [notes, pageNumber]);

    return (
        <Page
            key={`page_${pageNumber}_${notes.length}`}
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="bg-white"
            loading={<div className="h-[800px] w-[600px] bg-white animate-pulse" />}
            customTextRenderer={textRenderer}
        />
    );
});

const PDFReader = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAdmin, user, isDarkMode, toggleTheme } = useAuth();
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [sessionId, setSessionId] = useState(null);
    const [scale, setScale] = useState(1.5);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Notes State  
    const [notes, setNotes] = useState([]);
    const [showNotes, setShowNotes] = useState(false);
    const [selection, setSelection] = useState(null); // { text, page }
    const [noteText, setNoteText] = useState('');

    // Reader State
    const [showThumbnails, setShowThumbnails] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [pdfMeta, setPdfMeta] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const [outline, setOutline] = useState(null);
    const [showOutline, setShowOutline] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Refs
    const sessionRef = useRef(null);
    const startTimeRef = useRef(Date.now());
    const pageRefs = useRef({});
    const containerRef = useRef(null);

    const [blobUrl, setBlobUrl] = useState(null);

    // Fetch PDF Metadata & Blob
    useEffect(() => {
        const loadPdf = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Fetch Metadata
                const { data: meta } = await api.get(`/pdfs/${id}`);
                setPdfMeta(meta);

                if (meta.type && meta.type !== 'pdf') {
                    setError(`This viewer only supports PDF files. Current file type: ${meta.type.toUpperCase()}`);
                    setLoading(false);
                    return;
                }

                // 2. Fetch File as Blob
                const response = await api.get(`/pdfs/${id}/stream`, {
                    responseType: 'blob'
                });

                const blob = response.data;

                // Deep Check: Verify PDF Header (%PDF)
                const headerText = await blob.slice(0, 4).text();
                if (headerText !== '%PDF') {
                    // This is NOT a PDF.
                    if (blob.type.startsWith('image/')) {
                        setError('This is an Image file, not a PDF. Redirecting to Image Viewer...');
                        setTimeout(() => navigate(`/view-image/${id}`), 2000);
                    } else {
                        // Check if it's an error JSON
                        try {
                            const text = await blob.text();
                            const json = JSON.parse(text);
                            setError(json.message || 'Server error while loading file');
                        } catch (e) {
                            setError('Invalid document format. The file you are trying to open is not a valid PDF.');
                        }
                    }
                    setLoading(false);
                    return;
                }

                const url = URL.createObjectURL(blob);
                setBlobUrl(url);
            } catch (err) {
                console.error('Failed to load PDF', err);
                setError(err.response?.data?.message || 'Failed to load document');
            } finally {
                if (!error) setLoading(false);
            }
        };

        if (id) loadPdf();

        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [id]);

    // Session Management
    useEffect(() => {
        const startSession = async () => {
            try {
                const { data } = await api.post('/analytics/sessions/start', { pdfId: id });
                setSessionId(data._id);
            } catch (err) {
                console.error('Failed to start session', err);
            }
        };
        if (id) startSession();

        return () => {
            if (id) {
                api.post('/analytics/sessions/end', { pdfId: id }).catch(console.error);
            }
        };
    }, [id]);

    // Fetch notes
    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const { data } = await api.get(`/notes/${id}`);
                setNotes(data);
            } catch (err) {
                console.error('Failed to fetch notes', err);
            }
        };
        if (id) fetchNotes();
    }, [id]);

    // Intersection Observer for page tracking
    useEffect(() => {
        if (loading || !numPages) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const pageNum = parseInt(entry.target.getAttribute('data-page-number'));
                        if (pageNum) setPageNumber(pageNum);
                    }
                });
            },
            {
                root: containerRef.current?.parentElement || null,
                threshold: 0.2
            }
        );

        Object.values(pageRefs.current).forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [numPages, loading]);

    // Full screen handler
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    // Handle Text Selection
    const handleMouseUp = () => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) {
            let pageNum = pageNumber; // default to current state

            // More robust page detection using .closest()
            // We need to find the node starting from anchorNode's parent
            const anchorNode = sel.anchorNode;
            const element = anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentElement;

            const pageEl = element.closest('[data-page-number]');
            if (pageEl) {
                pageNum = parseInt(pageEl.getAttribute('data-page-number'));
            }

            setSelection({
                text: sel.toString(),
                page: pageNum
            });
        }
    };

    const saveNote = async () => {
        if (!selection || !noteText.trim()) return;
        try {
            const { data } = await api.post('/notes', {
                pdfId: id,
                selectedText: selection.text,
                noteContent: noteText,
                pageNumber: selection.page
            });
            setNotes([data, ...notes]);
            setSelection(null);
            setNoteText('');
            window.getSelection().removeAllRanges();
            setShowNotes(true);
        } catch (err) {
            console.error('Failed to save note', err);
            alert('Failed to save note');
        }
    };

    const deleteNote = async (noteId) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await api.delete(`/notes/${noteId}`);
            setNotes(notes.filter(n => n._id !== noteId));
        } catch (err) {
            console.error('Failed to delete note', err);
        }
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




    const onDocumentLoadSuccess = (pdf) => {
        setNumPages(pdf.numPages);
        setLoading(false);
        pdf.getOutline().then(setOutline);
    };



    if (error) return <div className="text-red-500 p-8">{error}</div>;

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            if (containerRef.current) {
                containerRef.current.requestFullscreen().then(() => setIsFullScreen(true));
            }
        } else {
            document.exitFullscreen().then(() => setIsFullScreen(false));
        }
    };

    return (
        <div
            ref={containerRef}
            className={`flex h-screen overflow-hidden transition-colors duration-200 ease-in-out bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100`}
        >
            {/* Thumbnails Sidebar */}
            {showThumbnails && (
                <div className={`w-48 border-r overflow-y-auto shrink-0 z-40 transition-all bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800`}>
                    <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-inherit dark:bg-zinc-950 z-10">
                        <span className="text-xs font-bold uppercase tracking-wider">Thumbnails</span>
                        <button onClick={() => setShowThumbnails(false)} className="hover:text-brand-500"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-2 flex flex-col gap-4">
                        {Array.from(new Array(numPages), (el, index) => (
                            <div
                                key={`thumb_${index + 1}`}
                                className={`cursor-pointer border-2 transition-all p-1 rounded ${pageNumber === index + 1 ? 'border-brand-500' : 'border-transparent hover:border-gray-300 dark:hover:border-zinc-700'}`}
                                onClick={() => {
                                    setPageNumber(index + 1);
                                    pageRefs.current[index + 1]?.scrollIntoView();
                                }}
                            >
                                <Page pageNumber={index + 1} width={150} renderTextLayer={false} renderAnnotationLayer={false} />
                                <div className="text-[10px] text-center mt-1">{index + 1}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TOC Sidebar */}
            {showOutline && outline && (
                <div className={`w-64 border-r overflow-y-auto shrink-0 z-40 transition-all bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800`}>
                    <div className="p-4 border-b dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-inherit dark:bg-zinc-950 z-10">
                        <span className="text-xs font-bold uppercase tracking-wider">Table of Contents</span>
                        <button onClick={() => setShowOutline(false)} className="hover:text-brand-500"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-2">
                        {outline.map((item, i) => (
                            <div
                                key={i}
                                className="text-sm py-2 px-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 rounded cursor-pointer truncate transition-colors"
                                onClick={() => {
                                    // Handle destination - this is simplified
                                    if (item.dest) {
                                        // Usually require pdf.getDestination(item.dest) but for now just jump if it's a number
                                        console.log('Jump to', item.dest);
                                    }
                                }}
                            >
                                {item.title}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div
                className="flex-1 flex flex-col items-center relative overflow-auto custom-scrollbar"
                onMouseUp={handleMouseUp}
            >
                {/* Ultra-Modern Floating Toolbar */}
                {/* Clean Flat Toolbar */}
                <div className={`sticky top-6 z-50 transition-all duration-150 ${isFullScreen ? 'w-auto' : 'w-full max-w-5xl'}`}>
                    <div className="mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-2 flex items-center justify-between gap-6 w-fit max-w-[95vw] shadow-lg dark:shadow-brand-500/5 transition-colors">

                        <button
                            onClick={() => navigate('/')}
                            className="text-gray-600 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 font-medium text-sm flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Library</span>
                        </button>

                        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                        {/* Controls Group */}
                        <div className="flex items-center gap-2">
                            {/* Zoom Control */}
                            <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 rounded-md p-1">
                                <button
                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-zinc-700 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-gray-500 dark:text-gray-400"
                                    onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[3.5rem] text-center select-none font-mono tabular-nums">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-zinc-700 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-gray-500 dark:text-gray-400"
                                    onClick={() => setScale(s => Math.min(3.0, s + 0.2))}
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Page Navigation */}
                            <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 rounded-md p-1">
                                <button
                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-zinc-700 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-500 dark:text-gray-400"
                                    disabled={pageNumber <= 1}
                                    onClick={previousPage}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[4rem] text-center select-none flex items-center justify-center gap-1">
                                    {pageNumber} <span className="text-gray-300 dark:text-gray-600">/</span> <span className="text-gray-500 dark:text-gray-400">{numPages || '-'}</span>
                                </span>
                                <button
                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-zinc-700 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-500 dark:text-gray-400"
                                    disabled={pageNumber >= numPages}
                                    onClick={nextPage}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                title={isDarkMode ? "Light Mode" : "Dark Mode"}
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
                                className={`p-2 rounded-md transition-colors ${showNotes ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-brand-600 dark:hover:text-brand-400'}`}
                                onClick={() => setShowNotes(!showNotes)}
                                title="Notes"
                            >
                                <MessageSquare className={`w-5 h-5 ${showNotes ? 'fill-current' : ''}`} />
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

                <div
                    className={`flex-1 w-full flex justify-center p-8 overflow-visible ${isDarkMode ? 'invert brightness-90 hue-rotate-180' : ''}`}
                    onContextMenu={(e) => pdfMeta?.accessControl?.viewOnly ? e.preventDefault() : null}
                >
                    {loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/80 backdrop-blur-sm">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                            <span className="text-gray-500 font-medium">Loading Document...</span>
                        </div>
                    )}

                    <Document
                        file={blobUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(err) => setError('Failed to load PDF. ' + err.message)}
                        className="flex flex-col items-center gap-8"
                    >
                        {Array.from(new Array(numPages), (el, index) => (
                            <div
                                key={`page_${index + 1}`}
                                ref={(el) => (pageRefs.current[index + 1] = el)}
                                data-page-number={index + 1}
                                className={`transition-transform duration-150 relative group border border-gray-200 mb-8`}>
                                <PageContent
                                    pageNumber={index + 1}
                                    scale={scale}
                                    notes={notes}
                                />
                                <div className="absolute bottom-4 right-4 bg-black/50 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Page {index + 1}
                                </div>
                            </div>
                        ))}
                    </Document>
                </div>

                {!isFullScreen && (
                    <div className="pb-4 text-[10px] text-gray-400 font-mono tracking-wider opacity-60">
                        SECURE SESSION: {sessionId?.slice(-8).toUpperCase()}
                    </div>
                )}

                {selection && (
                    <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg p-4 z-[60] w-96 shadow-lg">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Note</span>
                            <button onClick={() => { setSelection(null); window.getSelection().removeAllRanges(); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="bg-gray-50 rounded p-3 mb-3 border border-gray-100">
                            <p className="text-xs text-gray-600 italic line-clamp-3">
                                "{selection.text}"
                            </p>
                        </div>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Type your thoughts..."
                            className="w-full text-sm bg-white border border-gray-200 rounded-md p-3 mb-3 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                            rows={3}
                            autoFocus
                        />
                        <button
                            onClick={saveNote}
                            disabled={!noteText.trim()}
                            className="w-full bg-brand-600 text-white text-sm font-medium py-2 rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
                        >
                            Save Note
                        </button>
                    </div>
                )}
            </div>

            {showNotes && (
                <div className={`w-80 bg-white dark:bg-zinc-950 border-l border-gray-200 dark:border-zinc-800 h-full overflow-y-auto shrink-0 z-40 transition-all duration-150 ease-in-out`}>
                    <div className="p-5 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-950 z-10">
                        <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-brand-500" />
                            Notes <span className="text-gray-400 dark:text-gray-500 font-normal">({notes.length})</span>
                        </h2>
                        <button onClick={() => setShowNotes(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-4 flex flex-col gap-3">
                        {notes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <MessageSquare className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-sm font-medium text-gray-600">No notes yet</p>
                                <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Select any text in the document to create your first note.</p>
                            </div>
                        ) : (
                            notes.map(note => (
                                <div key={note._id} className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 hover:border-brand-200 dark:hover:border-brand-800 transition-colors relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <span
                                            className="text-[10px] font-bold tracking-wide text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/40 px-2 py-0.5 rounded cursor-pointer hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-colors"
                                            onClick={() => changePage(note.pageNumber - pageNumber)}
                                        >
                                            PAGE {note.pageNumber}
                                        </span>
                                        <button
                                            onClick={() => deleteNote(note._id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-colors"
                                            title="Delete note"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="mb-2 pl-3 border-l-2 border-brand-100 dark:border-brand-900">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2">
                                            "{note.selectedText}"
                                        </p>
                                    </div>

                                    <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                                        {note.noteContent}
                                    </p>

                                    <div className="text-[10px] text-gray-300 mt-2 pt-2 border-t border-gray-50 flex items-center gap-1">
                                        <span>{new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        <span>•</span>
                                        <span>{new Date(note.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Info Modal */}
            <MetadataModal
                pdf={pdfMeta}
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
                onUpdate={(updatedPdf) => setPdfMeta(updatedPdf)}
            />
        </div>
    );
};

export default PDFReader;
