import { useState, useRef } from 'react';
import api from '../api/axios';
import { Upload, FileText, CheckCircle, AlertCircle, Info, BookOpen, GraduationCap, Book, File } from 'lucide-react';

const IMPORT_TYPES = [
    {
        value: 'materials',
        label: 'Master CSV (Recommended)',
        icon: File,
        endpoint: '/pdfs/upload-csv',
        headers: [
            'filename', 'subjectCode'
        ],
        description: 'Minimal exact mapping: filename + subjectCode. Optional: courseCode and semesterCode for validation.'
    },
    {
        value: 'courses',
        label: 'Courses',
        icon: GraduationCap,
        endpoint: '/courses/upload',
        headers: ['name', 'code', 'description', 'semesterCount'],
        description: 'Define top-level course codes. Tip: Add semesterCount column to auto-generate semesters.'
    },
    {
        value: 'semesters',
        label: 'Semesters',
        icon: BookOpen,
        endpoint: '/semesters/upload',
        headers: ['name', 'code', 'description', 'courseCode'],
        description: 'Attach semester codes to existing course codes.'
    },
    {
        value: 'subjects',
        label: 'Subjects',
        icon: Book,
        endpoint: '/subjects/upload',
        headers: ['name', 'code', 'description', 'courseCode', 'semesterCode'],
        description: 'Create subject codes used by material mapping and filters.'
    },
];

const IMPORT_ORDER = IMPORT_TYPES.map((type) => type.value);

const CSVImporter = ({ onOpenBulkUpload }) => {
    const [selectedType, setSelectedType] = useState('materials');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [completedTypes, setCompletedTypes] = useState([]);
    const [lastImportedType, setLastImportedType] = useState(null);
    const fileInputRef = useRef(null);

    const currentType = IMPORT_TYPES.find((type) => type.value === selectedType) || IMPORT_TYPES[0];

    const handleSelectType = (value) => {
        setSelectedType(value);
        setResult(null);
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await api.post(currentType.endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const activeIndex = IMPORT_ORDER.indexOf(currentType.value);
            const nextTypeValue = currentType.value === 'materials'
                ? null
                : IMPORT_ORDER[activeIndex + 1];
            const nextType = IMPORT_TYPES.find((type) => type.value === nextTypeValue);
            const baseMessage = data.message || `${currentType.label} import completed successfully.`;
            const message = nextType
                ? `${baseMessage} Next suggested step: ${nextType.label}.`
                : baseMessage;

            setResult({ success: true, message, data });
            setLastImportedType(currentType.value);
            setCompletedTypes((prev) => (prev.includes(currentType.value)
                ? prev
                : [...prev, currentType.value]));

            if (nextTypeValue) {
                setSelectedType(nextTypeValue);
            }

            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error('Import error:', error);
            setResult({
                success: false,
                message: error.response?.data?.message || 'Failed to process CSV file.'
            });
        } finally {
            setUploading(false);
        }
    };

    const showGoToBulkUpload = Boolean(
        onOpenBulkUpload
        && result?.success
        && (lastImportedType === 'materials' || completedTypes.includes('subjects'))
    );

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">Course and Metadata CSV Setup</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-zinc-400 ml-10">
                    Fastest path: use one Master CSV. Advanced mode: import courses, semesters, and subjects separately.
                </p>

                <div className="mt-4 ml-10 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-950/40 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Import Modes</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        {IMPORT_ORDER.map((value, index) => {
                            const type = IMPORT_TYPES.find((item) => item.value === value);
                            const isActive = selectedType === value;
                            const isCompleted = completedTypes.includes(value);

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => handleSelectType(value)}
                                    className={`text-left rounded-lg border px-3 py-2 transition-colors ${isActive
                                        ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-gray-100 dark:hover:bg-zinc-900'
                                        }`}
                                >
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-500">Mode {index + 1}</p>
                                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 mt-1">{type?.label}</p>
                                    {isCompleted && (
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mt-1">Completed</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: configuration */}
                    <div className="space-y-6">
                        <section>
                            <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1">1. Select Target Section</label>
                            <div className="grid grid-cols-1 gap-2">
                                {IMPORT_TYPES.map((type) => (
                                    <div
                                        key={type.value}
                                        onClick={() => handleSelectType(type.value)}
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${selectedType === type.value
                                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10'
                                            : 'border-transparent bg-gray-50 dark:bg-zinc-950 hover:bg-gray-100 dark:hover:bg-zinc-900'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${selectedType === type.value ? 'bg-brand-600 text-white' : 'bg-white dark:bg-zinc-900 text-gray-400'}`}>
                                            <type.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${selectedType === type.value ? 'text-brand-700 dark:text-brand-400' : 'text-gray-700 dark:text-zinc-300'}`}>{type.label}</p>
                                            <p className="text-[11px] text-gray-500 dark:text-zinc-500 font-medium leading-tight mt-0.5">{type.description}</p>
                                        </div>
                                        {selectedType === type.value && (
                                            <div className="ml-auto">
                                                <CheckCircle className="w-5 h-5 text-brand-500 fill-brand-500 text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className={`p-4 rounded-xl border ${selectedType === 'materials'
                            ? 'bg-amber-50/70 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/20'
                            : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20'}`}>
                            <div className="flex items-start gap-3">
                                <Info className={`w-4 h-4 mt-1 flex-shrink-0 ${selectedType === 'materials'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-blue-600 dark:text-blue-400'}`} />
                                <div>
                                    <h4 className={`text-sm font-bold ${selectedType === 'materials'
                                        ? 'text-amber-800 dark:text-amber-300'
                                        : 'text-blue-800 dark:text-blue-300'}`}>
                                        {selectedType === 'materials'
                                            ? 'Important for Master CSV'
                                            : 'Setup guidance'}
                                    </h4>
                                    <p className={`text-[11px] mt-1 leading-relaxed ${selectedType === 'materials'
                                        ? 'text-amber-700 dark:text-amber-400'
                                        : 'text-blue-600 dark:text-blue-400/80'}`}>
                                        {selectedType === 'materials'
                                            ? 'Use minimal CSV for easy uploads: filename and subjectCode. courseCode and semesterCode are optional checks. Full hierarchy columns are still supported.'
                                            : 'If you choose separate imports, run Courses then Semesters then Subjects before mapping materials.'}
                                    </p>
                                    {selectedType === 'materials' && onOpenBulkUpload && (
                                        <button
                                            type="button"
                                            onClick={onOpenBulkUpload}
                                            className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-900/30 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
                                        >
                                            Open Guided Bulk Upload
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                            <div className="flex items-start gap-3">
                                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300">CSV Template Requirements</h4>
                                    <p className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-1 leading-relaxed">
                                        Required headers (case-insensitive):
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {currentType.headers.map(h => (
                                            <code key={h} className="px-1.5 py-0.5 bg-white dark:bg-zinc-900/50 rounded text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">{h}</code>
                                        ))}
                                    </div>
                                    {selectedType === 'materials' && (
                                        <p className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-2 leading-relaxed">
                                            Optional headers: courseCode, semesterCode, title, author, year, language, type.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right: Upload Area */}
                    <div className="flex flex-col">
                        <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1">2. Upload your CSV file</label>
                        <div
                            className={`flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer ${file
                                ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-500/5'
                                : 'border-gray-200 dark:border-zinc-800 hover:border-gray-400 dark:hover:border-zinc-700 bg-gray-50/30 dark:bg-zinc-950/30'}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {file ? (
                                <div className="text-center">
                                    <div className="p-4 bg-brand-100 dark:bg-brand-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-50 duration-300">
                                        <FileText className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate max-w-[240px]">{file.name}</p>
                                    <p className="text-xs text-brand-500 font-bold mt-1 uppercase tracking-tight">File Ready for Import</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        className="mt-4 text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest"
                                    >
                                        Change File
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center group">
                                    <div className="p-4 bg-gray-100 dark:bg-zinc-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110">
                                        <Upload className="w-8 h-8 text-gray-400 dark:text-zinc-600" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">Click to browse CSV</p>
                                    <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1 uppercase tracking-widest font-bold">Max size 10MB</p>
                                </div>
                            )}
                        </div>

                        {result && (
                            <div className={`mt-4 p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300 ${result.success
                                ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20 text-green-700 dark:text-green-400'
                                : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-700 dark:text-red-400'}`}>
                                <div className="flex items-start gap-3">
                                    {result.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                    <div>
                                        <p className="text-sm font-bold leading-tight">{result.message}</p>
                                        {result.data && (
                                            <div className="flex gap-4 mt-2 flex-wrap">
                                                {result.data.matched !== undefined && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Matched: {result.data.matched}</span>
                                                )}
                                                {result.data.modified !== undefined && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Modified: {result.data.modified}</span>
                                                )}
                                                {result.data.updated !== undefined && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Updated: {result.data.updated}</span>
                                                )}
                                                {result.data.inserted !== undefined && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">New: {result.data.inserted}</span>
                                                )}
                                                {result.data.skipped !== undefined && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Skipped: {result.data.skipped}</span>
                                                )}
                                                {result.data.hierarchySummary?.courses && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                                        Courses: +{result.data.hierarchySummary.courses.inserted} / {result.data.hierarchySummary.courses.updated} updated
                                                    </span>
                                                )}
                                                {result.data.hierarchySummary?.semesters && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                                        Semesters: +{result.data.hierarchySummary.semesters.inserted} / {result.data.hierarchySummary.semesters.updated} updated
                                                    </span>
                                                )}
                                                {result.data.hierarchySummary?.subjects && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                                        Subjects: +{result.data.hierarchySummary.subjects.inserted} / {result.data.hierarchySummary.subjects.updated} updated
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {showGoToBulkUpload && (
                                            <button
                                                type="button"
                                                onClick={onOpenBulkUpload}
                                                className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-900/30 bg-white/80 dark:bg-zinc-900/50 text-xs font-bold text-green-700 dark:text-green-300 hover:bg-white dark:hover:bg-zinc-900 transition-colors"
                                            >
                                                Continue to Guided Bulk Upload
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className={`w-full h-12 flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-brand-500/10 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 mt-4 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed ${uploading ? 'animate-pulse' : 'active:scale-[0.98]'}`}
                        >
                            {uploading ? 'Importing Data...' : `Start ${currentType.label} Import`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CSVImporter;
