import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { Upload, X, CheckCircle, AlertCircle, FileText, Loader, GraduationCap, Book } from 'lucide-react';
import CustomSelect from './CustomSelect';

const DOCUMENT_MIME_TYPES = [
    'application/pdf',
    'application/epub+zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'video/mp4'
];

const CSV_MIME_TYPES = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/plain'
];

const isCsvFile = (file) => {
    return CSV_MIME_TYPES.includes(file.type)
        || file.name?.toLowerCase().endsWith('.csv');
};

const isDocumentFile = (file) => DOCUMENT_MIME_TYPES.includes(file.type);

const normalizeFilename = (value) => String(value || '').trim().toLowerCase();

const splitCsvLine = (line, separator) => {
    const values = [];
    let current = '';
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];

        if (char === '"') {
            if (insideQuotes && line[index + 1] === '"') {
                current += '"';
                index += 1;
            } else {
                insideQuotes = !insideQuotes;
            }
            continue;
        }

        if (char === separator && !insideQuotes) {
            values.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current);
    return values;
};

const parseCsvText = (rawText) => {
    const cleanText = String(rawText || '').replace(/^\uFEFF/, '');
    const rows = cleanText
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

    if (rows.length === 0) {
        return { headers: [], rows: [] };
    }

    const firstLine = rows[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const separator = semicolonCount > commaCount ? ';' : ',';

    const headers = splitCsvLine(firstLine, separator)
        .map((header) => header.trim().toLowerCase())
        .filter(Boolean);

    if (headers.length === 0) {
        return { headers: [], rows: [] };
    }

    const parsedRows = rows
        .slice(1)
        .map((line) => {
            const cells = splitCsvLine(line, separator);
            const record = {};

            headers.forEach((header, headerIndex) => {
                record[header] = String(cells[headerIndex] || '').trim();
            });

            return record;
        })
        .filter((record) => Object.values(record).some(Boolean));

    return {
        headers,
        rows: parsedRows
    };
};

const BulkUpload = () => {
    const [files, setFiles] = useState([]);
    const [mappingFile, setMappingFile] = useState(null);
    const [mappingRows, setMappingRows] = useState([]);
    const [mappingHeaders, setMappingHeaders] = useState([]);
    const [mappingParseError, setMappingParseError] = useState('');
    const [parsingMapping, setParsingMapping] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const fileInputRef = useRef(null);
    const mappingInputRef = useRef(null);

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

    const clearMapping = useCallback(() => {
        setMappingFile(null);
        setMappingRows([]);
        setMappingHeaders([]);
        setMappingParseError('');
        setParsingMapping(false);
        if (mappingInputRef.current) {
            mappingInputRef.current.value = '';
        }
    }, []);

    const applyMappingFile = useCallback(async (selectedFile) => {
        if (!selectedFile) return;

        setMappingFile(selectedFile);
        setUploadResults(null);
        setMappingParseError('');
        setParsingMapping(true);

        try {
            const csvText = await selectedFile.text();
            const parsed = parseCsvText(csvText);
            setMappingRows(parsed.rows);
            setMappingHeaders(parsed.headers);

            if (parsed.headers.length === 0) {
                setMappingParseError('The selected CSV is empty.');
                return;
            }

            if (!parsed.headers.includes('filename')) {
                setMappingParseError('CSV must include a filename column for material matching.');
            }
        } catch (error) {
            console.error('Failed to parse mapping CSV:', error);
            setMappingRows([]);
            setMappingHeaders([]);
            setMappingParseError('Could not read the mapping CSV. Please check the file format and try again.');
        } finally {
            setParsingMapping(false);
        }
    }, []);

    const addIncomingFiles = useCallback((incomingFiles) => {
        const documentFiles = [];
        const csvFiles = [];

        incomingFiles.forEach((file) => {
            if (isCsvFile(file)) {
                csvFiles.push(file);
            } else if (isDocumentFile(file)) {
                documentFiles.push(file);
            }
        });

        if (documentFiles.length > 0) {
            setFiles((prev) => {
                const existingKeys = new Set(
                    prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
                );
                const nextFiles = documentFiles.filter((file) => {
                    const key = `${file.name}-${file.size}-${file.lastModified}`;
                    return !existingKeys.has(key);
                });
                return [...prev, ...nextFiles];
            });
        }

        if (csvFiles.length > 0) {
            void applyMappingFile(csvFiles[csvFiles.length - 1]);
        }

        if (documentFiles.length > 0 || csvFiles.length > 0) {
            setUploadResults(null);
        }
    }, [applyMappingFile]);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        addIncomingFiles(Array.from(e.dataTransfer.files || []));
    }, [addIncomingFiles]);

    const handleFileChange = (e) => {
        addIncomingFiles(Array.from(e.target.files || []));
    };

    const handleMappingFileChange = (e) => {
        const selected = Array.from(e.target.files || []).find(isCsvFile);
        if (selected) {
            void applyMappingFile(selected);
        }
    };

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleBulkUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setUploadResults(null);

        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });

        if (mappingFile) {
            formData.append('mappingFile', mappingFile);
        }

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

            setUploadResults(data);
            setFiles([]);
            clearMapping();
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error('Bulk upload error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Upload failed';

            setUploadResults({
                message: errorMessage,
                results: {
                    successful: [],
                    failed: files.map((file) => ({
                        originalName: file.name,
                        error: errorMessage
                    }))
                },
                mappingSummary: null
            });
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const mappingPreview = useMemo(() => {
        if (!mappingFile) return null;

        const hasFilenameColumn = mappingHeaders.includes('filename');
        if (!hasFilenameColumn) {
            return {
                hasFilenameColumn: false,
                uniqueCsvRows: 0,
                matchedSelectedFiles: 0,
                uploadsWithoutCsvMatch: files.length,
                unusedCsvRows: 0,
                sampleUnmatchedFiles: [],
                sampleUnusedCsvRows: []
            };
        }

        const uniqueCsvKeys = Array.from(new Set(
            mappingRows
                .map((row) => normalizeFilename(row.filename))
                .filter(Boolean)
        ));

        const csvKeySet = new Set(uniqueCsvKeys);
        const selectedKeys = files.map((file) => normalizeFilename(file.name));
        const selectedKeySet = new Set(selectedKeys);

        const matchedSelectedFiles = selectedKeys.reduce((count, key) => count + (csvKeySet.has(key) ? 1 : 0), 0);
        const uploadsWithoutCsvMatch = Math.max(files.length - matchedSelectedFiles, 0);
        const unusedCsvRows = uniqueCsvKeys.reduce((count, key) => count + (selectedKeySet.has(key) ? 0 : 1), 0);

        const sampleUnmatchedFiles = files
            .filter((file) => !csvKeySet.has(normalizeFilename(file.name)))
            .slice(0, 3)
            .map((file) => file.name);

        const sampleUnusedCsvRows = uniqueCsvKeys
            .filter((key) => !selectedKeySet.has(key))
            .slice(0, 3);

        return {
            hasFilenameColumn: true,
            uniqueCsvRows: uniqueCsvKeys.length,
            matchedSelectedFiles,
            uploadsWithoutCsvMatch,
            unusedCsvRows,
            sampleUnmatchedFiles,
            sampleUnusedCsvRows
        };
    }, [mappingFile, mappingHeaders, mappingRows, files]);

    const successfulResults = uploadResults?.results?.successful || [];
    const failedResults = uploadResults?.results?.failed || [];
    const mappingSummary = uploadResults?.mappingSummary;
    const hierarchySummary = uploadResults?.hierarchySummary;
    const hasSelectedDocuments = files.length > 0;
    const canUpload = hasSelectedDocuments
        && !uploading
        && (!mappingFile || (!parsingMapping && !mappingParseError && mappingPreview?.hasFilenameColumn !== false));
    const autoMappedPreview = mappingPreview?.matchedSelectedFiles || 0;
    const fallbackPreview = Math.max(files.length - autoMappedPreview, 0);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Upload Materials</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors">
                    One screen, one flow. Upload files and optionally attach one Master CSV for filename mapping and hierarchy updates.
                </p>
            </div>

            <div className="mb-6 rounded-xl border border-brand-100 dark:border-brand-900/20 bg-brand-50/50 dark:bg-brand-900/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Quick Steps</p>
                <ol className="mt-2 list-decimal pl-5 space-y-1 text-sm text-brand-800 dark:text-brand-200">
                    <li>Select all document files you want to upload.</li>
                    <li>Optional: select one Master CSV with a filename column.</li>
                    <li>Upload and check the auto-mapping summary.</li>
                </ol>
            </div>

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
                        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Document files are required. Master CSV is optional.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center px-6 py-2.5 border border-brand-600 shadow-sm text-sm font-medium rounded-lg text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Select Document Files
                        </button>
                        <button
                            type="button"
                            onClick={() => mappingInputRef.current?.click()}
                            className="inline-flex items-center px-6 py-2.5 border border-blue-200 dark:border-blue-900/40 shadow-sm text-sm font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Select Mapping CSV
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.epub,.doc,.docx,.jpg,.png,.mp4,.mp3"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <input
                        ref={mappingInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleMappingFileChange}
                        className="hidden"
                    />
                    <p className="text-xs text-gray-500 dark:text-zinc-500 transition-colors">
                        Supports PDF, EPUB, DOC, Images, Audio, and Video files up to 50MB each. Minimal CSV for exact mapping: filename + subjectCode.
                    </p>
                </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-5">
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">Assign To Existing Course and Subject (Optional)</h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                        This assignment is used for new materials, and as fallback when a file is not matched by CSV filename.
                    </p>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Course</label>
                        <CustomSelect
                            options={[{ value: '', label: 'No Course Assigned' }, ...courses.map((course) => ({ value: course.code, label: `${course.name} - ${course.code}` }))]}
                            value={selectedCourse}
                            onChange={(val) => {
                                setSelectedCourse(val);
                                setSelectedSubject('');
                            }}
                            icon={GraduationCap}
                            placeholder="Search or Select Course"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-widest ml-1">Subject</label>
                        <CustomSelect
                            options={[{ value: '', label: 'No Subject Assigned' }, ...subjects
                                .filter((subject) => !selectedCourse || subject.courseCode === selectedCourse)
                                .map((subject) => ({ value: subject.code, label: `${subject.name} - ${subject.code}` }))
                            ]}
                            value={selectedSubject}
                            onChange={setSelectedSubject}
                            icon={Book}
                            placeholder="Search or Select Subject"
                        />
                    </div>
                </div>
            </div>

            {mappingFile && (
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-blue-900 dark:text-blue-200">Auto-mapping CSV ready</p>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">{mappingFile.name}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                    Matching uses original filename. Recommended minimal columns: filename, subjectCode. courseCode and semesterCode are optional checks.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={clearMapping}
                            className="text-blue-500 hover:text-red-500 transition-colors"
                            title="Remove mapping CSV"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mt-4">
                        {parsingMapping && (
                            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                                <Loader className="w-4 h-4 animate-spin" />
                                Reading mapping file...
                            </div>
                        )}

                        {!parsingMapping && mappingParseError && (
                            <div className="rounded-lg border border-red-100 dark:border-red-900/20 bg-red-50 dark:bg-red-900/10 p-3">
                                <p className="text-xs font-semibold text-red-700 dark:text-red-300">{mappingParseError}</p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    Fix the CSV or remove it to continue with fallback-only upload.
                                </p>
                            </div>
                        )}

                        {!parsingMapping && !mappingParseError && mappingPreview?.hasFilenameColumn && (
                            <div className="rounded-lg border border-blue-100 dark:border-blue-900/20 bg-white/90 dark:bg-zinc-950/60 p-3 space-y-1.5">
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">CSV Check Complete</p>
                                <p className="text-sm text-blue-900 dark:text-blue-200">Rows in CSV: {mappingPreview.uniqueCsvRows}</p>
                                <p className="text-sm text-green-700 dark:text-green-300">Will auto-map: {mappingPreview.matchedSelectedFiles}</p>
                                <p className="text-sm text-amber-700 dark:text-amber-300">Needs fallback or manual review: {mappingPreview.uploadsWithoutCsvMatch}</p>
                                <p className="text-xs text-gray-600 dark:text-zinc-400">Unused CSV rows: {mappingPreview.unusedCsvRows}</p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">Exact mapping tip: subjectCode determines the correct course and semester.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-colors">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Selected Files ({files.length})
                    </h3>
                    <button
                        onClick={() => setFiles([])}
                        disabled={!hasSelectedDocuments}
                        className={`text-sm font-medium transition-colors ${hasSelectedDocuments
                            ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            : 'text-gray-300 dark:text-zinc-700 cursor-not-allowed'
                            }`}
                    >
                        Clear All
                    </button>
                </div>

                {hasSelectedDocuments ? (
                    <ul className="divide-y divide-gray-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
                        {files.map((file, index) => (
                            <li key={`${file.name}-${file.size}-${index}`} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
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
                ) : (
                    <div className="px-6 py-8 space-y-4">
                        <div className="rounded-xl border border-amber-100 dark:border-amber-900/20 bg-amber-50 dark:bg-amber-900/10 p-4">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                No document files selected yet
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                The mapping CSV does not upload the materials by itself. You still need to choose the PDF, DOC, image, audio, or video files you want to upload.
                            </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-500">
                            Quick path: click Select Document Files, pick your files, optionally add Master CSV, then upload.
                        </p>
                    </div>
                )}

                <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-200 dark:border-zinc-800">
                    <button
                        onClick={handleBulkUpload}
                        disabled={!canUpload}
                        className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 shadow-brand-500/10 ${!canUpload ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {uploading ? (
                            <>
                                <Loader className="animate-spin h-5 w-5 mr-2" />
                                Processing {files.length} file{files.length !== 1 ? 's' : ''}...
                            </>
                        ) : hasSelectedDocuments ? (
                            <>
                                <Upload className="h-5 w-5 mr-2" />
                                Upload {files.length} file{files.length !== 1 ? 's' : ''}
                                {mappingFile && !mappingParseError && !parsingMapping
                                    ? ` (${autoMappedPreview} auto-mapped, ${fallbackPreview} fallback)`
                                    : ''}
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5 mr-2" />
                                Select Document Files To Continue
                            </>
                        )}
                    </button>
                </div>
            </div>

            {uploadResults && (
                <div className="mt-6 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Upload Results</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {uploadResults.message && (
                            <div className={`p-4 rounded-lg border ${failedResults.length > 0 && successfulResults.length === 0
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-700 dark:text-red-400'
                                : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-700 dark:text-blue-300'
                                }`}>
                                <p className="text-sm font-medium">{uploadResults.message}</p>
                            </div>
                        )}

                        <div className="flex items-center gap-4 pb-4 border-b dark:border-zinc-800">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {successfulResults.length} Successful
                                    </span>
                                </div>
                            </div>
                            {failedResults.length > 0 && (
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {failedResults.length} Failed
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {hierarchySummary && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-4 border-b dark:border-zinc-800">
                                <div className="rounded-lg border border-indigo-100 dark:border-indigo-900/20 bg-indigo-50 dark:bg-indigo-900/10 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Courses</p>
                                    <p className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mt-1">
                                        +{hierarchySummary.courses?.inserted || 0} / {hierarchySummary.courses?.updated || 0} updated
                                    </p>
                                </div>
                                <div className="rounded-lg border border-sky-100 dark:border-sky-900/20 bg-sky-50 dark:bg-sky-900/10 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Semesters</p>
                                    <p className="text-lg font-bold text-sky-900 dark:text-sky-200 mt-1">
                                        +{hierarchySummary.semesters?.inserted || 0} / {hierarchySummary.semesters?.updated || 0} updated
                                    </p>
                                </div>
                                <div className="rounded-lg border border-violet-100 dark:border-violet-900/20 bg-violet-50 dark:bg-violet-900/10 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Subjects</p>
                                    <p className="text-lg font-bold text-violet-900 dark:text-violet-200 mt-1">
                                        +{hierarchySummary.subjects?.inserted || 0} / {hierarchySummary.subjects?.updated || 0} updated
                                    </p>
                                </div>
                            </div>
                        )}

                        {mappingSummary && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4 border-b dark:border-zinc-800">
                                <div className="rounded-lg border border-blue-100 dark:border-blue-900/20 bg-blue-50 dark:bg-blue-900/10 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">CSV Rows</p>
                                    <p className="text-lg font-bold text-blue-900 dark:text-blue-200 mt-1">{mappingSummary.uniqueCsvRows}</p>
                                </div>
                                <div className="rounded-lg border border-green-100 dark:border-green-900/20 bg-green-50 dark:bg-green-900/10 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">Auto-Mapped</p>
                                    <p className="text-lg font-bold text-green-900 dark:text-green-200 mt-1">{mappingSummary.autoMappedFiles}</p>
                                </div>
                                <div className="rounded-lg border border-amber-100 dark:border-amber-900/20 bg-amber-50 dark:bg-amber-900/10 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">No Match</p>
                                    <p className="text-lg font-bold text-amber-900 dark:text-amber-200 mt-1">{mappingSummary.uploadsWithoutCsvMatch}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 p-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Unused Rows</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{mappingSummary.unusedCsvRows}</p>
                                </div>
                            </div>
                        )}

                        {mappingSummary?.invalidMappings > 0 && (
                            <div className="rounded-lg border border-amber-200 dark:border-amber-900/20 bg-amber-50 dark:bg-amber-900/10 p-3">
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                    {mappingSummary.invalidMappings} CSV mapping row(s) were ignored due to course/semester/subject mismatch.
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                    Check subjectCode with matching courseCode and semesterCode, or keep only filename + subjectCode.
                                </p>
                            </div>
                        )}

                        {successfulResults.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Successfully Uploaded</h4>
                                <ul className="space-y-2">
                                    {successfulResults.map((result, index) => (
                                        <li key={`${result.originalName}-${index}`} className="flex items-start gap-2 text-sm p-3 bg-green-50 dark:bg-green-900/10 rounded-lg transition-colors border border-green-100 dark:border-green-900/20">
                                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{result.title}</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                    Original: {result.originalName}
                                                    {result.processed && (
                                                        <span className="ml-2 text-green-600 dark:text-green-400">
                                                            - Metadata extracted
                                                        </span>
                                                    )}
                                                </p>
                                                {result.mappingIssue && (
                                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                                        {result.mappingIssue}
                                                    </p>
                                                )}
                                                {(result.autoMapped || result.courseCode || result.subjectCode) && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {result.autoMapped && (
                                                            <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">
                                                                Auto-mapped
                                                            </span>
                                                        )}
                                                        {result.courseCode && (
                                                            <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-bold">
                                                                {result.courseCode}
                                                            </span>
                                                        )}
                                                        {result.subjectCode && (
                                                            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold">
                                                                {result.subjectCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {failedResults.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Failed Uploads</h4>
                                <ul className="space-y-2">
                                    {failedResults.map((result, index) => (
                                        <li key={`${result.originalName}-${index}`} className="flex items-start gap-2 text-sm p-3 bg-red-50 dark:bg-red-900/10 rounded-lg transition-colors border border-red-100 dark:border-red-900/20">
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
