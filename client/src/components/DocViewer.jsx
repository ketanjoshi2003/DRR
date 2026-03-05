import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    Loader, ChevronLeft, Download, AlertCircle, Maximize, Minimize,
    ZoomIn, ZoomOut, Sun, Moon, Info, MessageSquare, X, Trash2
} from 'lucide-react';
import MetadataModal from './MetadataModal';
import { usePreventDownload } from '../hooks/usePreventDownload';

const HIGHLIGHT_COLORS = [
    { name: 'Yellow', value: 'rgba(250, 204, 21, 0.45)' },
    { name: 'Green', value: 'rgba(74, 222, 128, 0.4)' },
    { name: 'Blue', value: 'rgba(96, 165, 250, 0.4)' },
    { name: 'Pink', value: 'rgba(244, 114, 182, 0.4)' },
    { name: 'Orange', value: 'rgba(251, 146, 60, 0.4)' }
];

const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS[0].value;

const DocViewer = () => {
    usePreventDownload();
    const { id } = useParams();
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useAuth();
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [scale, setScale] = useState(window.innerWidth < 768 ? ((window.innerWidth - 32) / 850) * 100 : 100);
    const [showInfo, setShowInfo] = useState(false);
    const [sessionId, setSessionId] = useState(null);

    // Notes State
    const [notes, setNotes] = useState([]);
    const [showNotes, setShowNotes] = useState(false);
    const [selection, setSelection] = useState(null); // { text }
    const [noteText, setNoteText] = useState('');
    const [selectedHighlightColor, setSelectedHighlightColor] = useState(DEFAULT_HIGHLIGHT_COLOR);
    const [docRendered, setDocRendered] = useState(false);
    const previousNotesRef = useRef([]);

    // Reading Session Analytics
    useEffect(() => {
        let heartbeatInterval;

        const startSession = async () => {
            try {
                const { data } = await api.post('/analytics/session/start', { pdfId: id });
                setSessionId(data._id);

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
                setDocRendered(false);
                previousNotesRef.current = [];
                setNotes([]);
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
                    setDocRendered(true);
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

    const clearHighlights = useCallback(() => {
        if (!containerRef.current) return;

        const existingMarks = containerRef.current.querySelectorAll('mark[data-note-highlight]');
        existingMarks.forEach((mark) => {
            const parent = mark.parentNode;
            if (!parent) return;
            const textNode = document.createTextNode(mark.textContent);
            parent.replaceChild(textNode, mark);
            parent.normalize();
        });
    }, []);

    const removeHighlightsByNoteIds = useCallback((noteIds) => {
        if (!containerRef.current || noteIds.length === 0) return;

        const noteIdSet = new Set(noteIds);
        const marks = containerRef.current.querySelectorAll('mark[data-note-highlight][data-note-id]');
        marks.forEach((mark) => {
            const noteId = mark.getAttribute('data-note-id');
            if (!noteIdSet.has(noteId)) return;

            const parent = mark.parentNode;
            if (!parent) return;
            const textNode = document.createTextNode(mark.textContent);
            parent.replaceChild(textNode, mark);
            parent.normalize();
        });
    }, []);

    // Apply highlights to rendered DOCX content.
    const applyHighlights = useCallback((notesToApply, { resetExisting = false } = {}) => {
        if (!containerRef.current || !docRendered) return;

        if (resetExisting) {
            clearHighlights();
        }

        if (!notesToApply || notesToApply.length === 0) return;

        // Walk through text nodes that are not already inside highlight marks.
        const textNodes = [];
        const treeWalker = document.createTreeWalker(
            containerRef.current,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (candidate) => {
                    if (!candidate.textContent || candidate.textContent.length === 0) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    const parentElement = candidate.parentElement;
                    if (parentElement?.closest('mark[data-note-highlight]')) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while ((node = treeWalker.nextNode())) {
            textNodes.push(node);
        }

        // Build a full text string with node mapping.
        let fullText = '';
        const nodeMap = []; // { node, start, end }
        textNodes.forEach((textNode) => {
            const start = fullText.length;
            fullText += textNode.textContent;
            nodeMap.push({ node: textNode, start, end: fullText.length });
        });

        // For each note, find one occurrence and wrap it.
        notesToApply.forEach((note) => {
            const searchText = note.selectedText;
            if (!searchText || searchText.trim().length === 0) return;

            // FUZZY MATCHING:
            // Normalize spaces, escape for regex, and allow flexible whitespace.
            const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const fuzzyRegexSource = escapedSearch.replace(/\s+/g, '\\s*');

            let match;
            try {
                const regex = new RegExp(fuzzyRegexSource, 'gi');
                match = regex.exec(fullText);
            } catch (err) {
                console.error('Highlight regex creation failed:', err);
                return;
            }

            if (!match) return;

            const matchStart = match.index;
            const matchEnd = match.index + match[0].length;

            // Find which text nodes this match spans and highlight them all.
            for (let i = 0; i < nodeMap.length; i++) {
                const nodeMeta = nodeMap[i];
                if (nodeMeta.end <= matchStart) continue;
                if (nodeMeta.start >= matchEnd) break;

                const textNode = nodeMeta.node;
                if (!textNode?.parentNode) continue;

                const nodeStart = nodeMeta.start;
                const nodeEnd = nodeMeta.end;

                const overlapStart = Math.max(matchStart, nodeStart) - nodeStart;
                const overlapEnd = Math.min(matchEnd, nodeEnd) - nodeStart;
                if (overlapStart >= overlapEnd) continue;

                const nodeText = textNode.textContent;
                const before = nodeText.substring(0, overlapStart);
                const matched = nodeText.substring(overlapStart, overlapEnd);
                const after = nodeText.substring(overlapEnd);

                const frag = document.createDocumentFragment();

                if (before) {
                    frag.appendChild(document.createTextNode(before));
                }

                const mark = document.createElement('mark');
                mark.setAttribute('data-note-highlight', 'true');
                mark.setAttribute('data-note-id', note._id);
                mark.style.backgroundColor = note.color || DEFAULT_HIGHLIGHT_COLOR;
                mark.style.color = '#111827';
                mark.style.borderRadius = '2px';
                mark.style.padding = '1px 0';
                mark.style.cursor = 'pointer';
                mark.style.mixBlendMode = 'normal';
                mark.style.filter = 'none';
                mark.style.webkitTextFillColor = '#111827';
                mark.title = note.noteContent || 'Note';
                mark.textContent = matched;
                frag.appendChild(mark);

                if (after) {
                    frag.appendChild(document.createTextNode(after));
                }

                const parent = textNode.parentNode;
                parent.replaceChild(frag, textNode);

                // Update the nodeMap to reflect nodes we just created.
                const newEntries = [];
                let currentNode = mark.previousSibling;
                if (before && currentNode) {
                    newEntries.push({ node: currentNode, start: nodeStart, end: nodeStart + before.length });
                }
                newEntries.push({ node: mark.firstChild, start: nodeStart + overlapStart, end: nodeStart + overlapEnd });

                currentNode = mark.nextSibling;
                if (after && currentNode) {
                    newEntries.push({ node: currentNode, start: nodeStart + overlapEnd, end: nodeEnd });
                }

                nodeMap.splice(i, 1, ...newEntries);
                i += newEntries.length - 1;
            }
        });
    }, [clearHighlights, docRendered]);

    useEffect(() => {
        if (!docRendered) return;

        const previousNotes = previousNotesRef.current;
        const previousNoteIdSet = new Set(previousNotes.map((note) => note._id));
        const currentNoteIdSet = new Set(notes.map((note) => note._id));

        const removedNoteIds = previousNotes
            .filter((note) => !currentNoteIdSet.has(note._id))
            .map((note) => note._id);
        const addedNotes = notes.filter((note) => !previousNoteIdSet.has(note._id));

        const frame = requestAnimationFrame(() => {
            if (previousNotes.length === 0) {
                applyHighlights(notes, { resetExisting: true });
            } else if (addedNotes.length > 0 && removedNoteIds.length === 0) {
                applyHighlights(addedNotes, { resetExisting: false });
            } else if (addedNotes.length === 0 && removedNoteIds.length > 0) {
                removeHighlightsByNoteIds(removedNoteIds);
            } else {
                applyHighlights(notes, { resetExisting: true });
            }

            previousNotesRef.current = notes;
        });

        return () => cancelAnimationFrame(frame);
    }, [applyHighlights, docRendered, isDarkMode, notes, removeHighlightsByNoteIds]);

    // Handle Text Selection
    const handleMouseUp = () => {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) {
            // Check if the selection is within the document container
            const anchorNode = sel.anchorNode;
            const element = anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentElement;
            if (containerRef.current && containerRef.current.contains(element)) {
                setSelection({
                    text: sel.toString()
                });
            }
        }
    };

    const saveNote = async () => {
        if (!selection || !noteText.trim()) return;
        try {
            const { data } = await api.post('/notes', {
                pdfId: id,
                selectedText: selection.text,
                noteContent: noteText,
                pageNumber: 1, // Docs don't have page numbers in the same way as PDFs
                color: selectedHighlightColor
            });
            setNotes((prevNotes) => [data, ...prevNotes]);
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
            setNotes((prevNotes) => prevNotes.filter((n) => n._id !== noteId));
        } catch (err) {
            console.error('Failed to delete note', err);
        }
    };

    // Handle container resize for fluid responsiveness
    useEffect(() => {
        if (!viewerRef.current) return;

        const handleResize = (entries) => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                const padding = window.innerWidth < 768 ? 32 : 64;
                const availableWidth = width - padding;

                if (availableWidth < 850) {
                    const newScale = (availableWidth / 850) * 100;
                    setScale(Math.floor(newScale));
                } else {
                    setScale(100);
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

    return (
        <div ref={rootRef} className={`flex h-screen overflow-hidden transition-colors duration-200 ease-in-out bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}>

            <div
                ref={viewerRef}
                className="flex-1 flex flex-col items-center relative overflow-auto custom-scrollbar w-full"
                onMouseUp={handleMouseUp}
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

                {/* Content Area */}
                <div className={`flex-1 w-full flex justify-center p-4 md:p-8 overflow-visible ${isDarkMode ? 'dark-mode-doc' : ''}`}>
                    <div
                        className={`bg-transparent relative transition-all duration-200 ease-linear ${loading ? 'opacity-0' : 'opacity-100'}`}
                        style={{
                            transform: `scale(${scale / 100})`,
                            transformOrigin: 'top center',
                            minHeight: '1000px',
                            width: '850px'
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

                {/* Selection Popup for Creating Notes */}
                {selection && (
                    <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 z-[60] w-96 shadow-lg">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">New Note</span>
                            <button onClick={() => { setSelection(null); window.getSelection().removeAllRanges(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-zinc-800 rounded p-3 mb-3 border border-gray-100 dark:border-zinc-700">
                            <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-3">
                                "{selection.text}"
                            </p>
                        </div>
                        <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Highlight Color
                                </span>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                    {HIGHLIGHT_COLORS.find((color) => color.value === selectedHighlightColor)?.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {HIGHLIGHT_COLORS.map((color) => {
                                    const isSelected = selectedHighlightColor === color.value;
                                    return (
                                        <button
                                            key={color.name}
                                            type="button"
                                            onClick={() => setSelectedHighlightColor(color.value)}
                                            className={`w-6 h-6 rounded-full border transition-transform ${isSelected ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-gray-200 dark:border-zinc-700 hover:scale-105'}`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                            aria-label={`Use ${color.name} highlight`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Type your thoughts..."
                            className="w-full text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md p-3 mb-3 focus:outline-none focus:border-brand-500 transition-colors resize-none text-gray-900 dark:text-gray-100"
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

            {/* Notes Sidebar */}
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
                                <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                                    <MessageSquare className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                </div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No notes yet</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px]">Select any text in the document to create your first note.</p>
                            </div>
                        ) : (
                            notes.map(note => {
                                const highlightColor = note.color || DEFAULT_HIGHLIGHT_COLOR;
                                return (
                                <div
                                    key={note._id}
                                    className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 hover:border-brand-200 dark:hover:border-brand-800 transition-colors relative"
                                    style={{ borderLeft: `4px solid ${highlightColor}` }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-[10px] font-bold tracking-wide text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/40 px-2 py-0.5 rounded"
                                            >
                                                DOC
                                            </span>
                                            <span
                                                className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/20"
                                                style={{ backgroundColor: highlightColor }}
                                                title="Highlight color"
                                            />
                                        </div>
                                        <button
                                            onClick={() => deleteNote(note._id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-colors"
                                            title="Delete note"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="mb-2 pl-3 border-l-2" style={{ borderLeftColor: highlightColor }}>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2">
                                            "{note.selectedText}"
                                        </p>
                                    </div>

                                    <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                                        {note.noteContent}
                                    </p>

                                    <div className="text-[10px] text-gray-300 dark:text-gray-600 mt-2 pt-2 border-t border-gray-50 dark:border-zinc-800 flex items-center gap-1">
                                        <span>{new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                        <span>•</span>
                                        <span>{new Date(note.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

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
                    filter: invert(1) hue-rotate(180deg); /* Revert images only */
                }
                .dark-mode-doc mark[data-note-highlight] {
                    filter: none !important;
                    mix-blend-mode: normal !important;
                    color: #111827 !important;
                    -webkit-text-fill-color: #111827 !important;
                }
                /* Note highlight styles */
                mark[data-note-highlight] {
                    transition: background-color 0.2s ease;
                }
                mark[data-note-highlight]:hover {
                    outline: 2px solid rgba(107, 114, 128, 0.35);
                    outline-offset: 1px;
                }
            `}</style>
        </div>
    );
};

export default DocViewer;
