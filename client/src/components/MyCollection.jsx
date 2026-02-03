import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
    Bookmark, Book, GraduationCap, FileText,
    Image as ImageIcon, Film, FileAudio, File,
    Trash2, ChevronRight, LayoutGrid, Clock
} from 'lucide-react';

const MyCollection = () => {
    const [collection, setCollection] = useState({ courses: [], subjects: [], pdfs: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pdfs');

    useEffect(() => {
        fetchCollection();
    }, []);

    const fetchCollection = async () => {
        try {
            const { data } = await api.get('/collection');
            setCollection(data);
        } catch (error) {
            console.error('Error fetching collection:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeFromCollection = async (type, id) => {
        try {
            await api.post('/collection/remove', { type, id });
            // Update local state
            setCollection(prev => ({
                ...prev,
                [type]: prev[type].filter(item => item._id !== id)
            }));
        } catch (error) {
            console.error('Error removing from collection:', error);
            alert('Failed to remove item');
        }
    };

    const getFileIcon = (type, name) => {
        let t = type;
        const ext = name?.toLowerCase() || '';
        if (!t || t === 'other') {
            if (ext.endsWith('.pdf')) t = 'pdf';
            else if (ext.match(/\.(png|jpg|jpeg|gif|webp)$/)) t = 'image';
            else if (ext.endsWith('.docx') || type === 'doc') t = 'docx';
        }

        switch (t) {
            case 'pdf': return <FileText className="w-5 h-5 text-brand-600" />;
            case 'image': return <ImageIcon className="w-5 h-5 text-blue-600" />;
            case 'docx': return <FileText className="w-5 h-5 text-blue-600" />;
            default: return <File className="w-5 h-5 text-gray-600" />;
        }
    };

    const getViewLink = (pdf) => {
        const name = pdf.originalName?.toLowerCase() || '';
        const isImage = name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || pdf.type === 'image';
        const isDoc = name.endsWith('.docx') || pdf.type === 'doc';

        if (isImage) return `/view-image/${pdf._id}`;
        if (isDoc) return `/view-document/${pdf._id}`;
        return `/read/${pdf._id}`;
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="mt-4 text-gray-500 font-medium">Loading your collection...</p>
        </div>
    );

    const tabs = [
        { id: 'pdfs', label: 'Materials', icon: FileText, count: collection.pdfs?.length || 0 },
        { id: 'subjects', label: 'Subjects', icon: Book, count: collection.subjects?.length || 0 },
        { id: 'courses', label: 'Courses', icon: GraduationCap, count: collection.courses?.length || 0 }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl">
                    <Bookmark className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Collection</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Your saved courses, subjects, and reading materials.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 border-b dark:border-zinc-800 pb-px">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all relative
                            ${activeTab === tab.id
                                ? 'text-brand-600 dark:text-brand-400'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        <span className={`
                            ml-1 px-1.5 py-0.5 rounded-full text-[10px] 
                            ${activeTab === tab.id ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-gray-100 dark:bg-zinc-800'}
                        `}>
                            {tab.count}
                        </span>
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === 'pdfs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collection.pdfs?.map(pdf => (
                            <div key={pdf._id} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-brand-500/50 transition-all duration-150 group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg">
                                        {getFileIcon(pdf.type, pdf.originalName)}
                                    </div>
                                    <button
                                        onClick={() => removeFromCollection('pdfs', pdf._id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all"
                                        title="Remove from collection"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 truncate">{pdf.title}</h3>
                                <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Saved on {new Date(pdf.createdAt).toLocaleDateString()}
                                </p>
                                <Link
                                    to={getViewLink(pdf)}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-brand-50 dark:bg-brand-900/10 text-brand-600 dark:text-brand-400 text-sm font-bold rounded-lg hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 transition-all"
                                >
                                    {pdf.originalName?.toLowerCase().endsWith('.docx') ? 'View Document' :
                                        pdf.originalName?.toLowerCase().match(/\.(png|jpg|jpeg|gif)$/) ? 'View Image' :
                                            'Read Material'} <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'subjects' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collection.subjects?.map(subject => (
                            <div key={subject._id} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-brand-500/50 transition-all duration-150 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                                    <Book className="w-24 h-24" />
                                </div>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 text-[10px] font-bold rounded-md border border-brand-100 dark:border-brand-900/30">
                                            {subject.code}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeFromCollection('subjects', subject._id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 relative z-10">{subject.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 relative z-10">
                                    {subject.description || 'No description available for this subject.'}
                                </p>
                                <Link
                                    to={`/subjects?search=${subject.code}`}
                                    className="text-sm font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:gap-2 transition-all"
                                >
                                    View Materials <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'courses' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {collection.courses?.map(course => (
                            <div key={course._id} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 hover:border-brand-500/50 transition-all duration-150 flex gap-5">
                                <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl h-fit">
                                    <GraduationCap className="w-10 h-10 text-brand-600 dark:text-brand-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{course.name}</h3>
                                        <button
                                            onClick={() => removeFromCollection('courses', course._id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs font-mono text-gray-500 mb-3">{course.code}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                                        {course.description || 'Access all subjects and materials for this course program.'}
                                    </p>
                                    <Link
                                        to={`/courses`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg transition-all"
                                    >
                                        Go to Course <LayoutGrid className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {((activeTab === 'pdfs' && collection.pdfs?.length === 0) ||
                    (activeTab === 'subjects' && collection.subjects?.length === 0) ||
                    (activeTab === 'courses' && collection.courses?.length === 0)) && (
                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-zinc-900/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
                            <Bookmark className="w-12 h-12 text-gray-300 dark:text-zinc-700 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Your collection is empty</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-center mt-1 max-w-xs px-4">
                                Start adding materials, subjects, and courses to keep them accessible here.
                            </p>
                        </div>
                    )}
            </div>
        </div>
    );
};

export default MyCollection;
