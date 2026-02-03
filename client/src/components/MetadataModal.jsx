import { useState, useEffect } from 'react';
import { Info, X, Edit2, Save, CheckCircle, FileText, User, Tag, Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const MetadataModal = ({ pdf, isOpen, onClose, onUpdate }) => {
    const { isAdmin } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        author: '',
        subject: '',
        keywords: ''
    });

    useEffect(() => {
        if (pdf) {
            setEditForm({
                title: pdf.title || '',
                author: pdf.metadata?.author || '',
                subject: pdf.metadata?.subject || '',
                keywords: pdf.metadata?.keywords || ''
            });
        }
    }, [pdf, isOpen]);

    const handleUpdateMeta = async () => {
        try {
            const { data } = await api.put(`/pdfs/${pdf._id}`, {
                title: editForm.title,
                metadata: {
                    author: editForm.author,
                    subject: editForm.subject,
                    keywords: editForm.keywords
                }
            });
            if (onUpdate) onUpdate(data);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update metadata', err);
            alert('Failed to update metadata');
        }
    };

    if (!pdf || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={() => { if (!isEditing) onClose() }}
            />

            <div
                className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 fade-in duration-150 flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-900 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Document Information</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg transition-colors"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => { onClose(); setIsEditing(false); }}
                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar max-h-[70vh]">
                    {isEditing ? (
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Title</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:text-gray-100 font-medium"
                                        placeholder="Title"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Author</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="text"
                                            value={editForm.author}
                                            onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:text-gray-100 font-medium"
                                            placeholder="Author"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Subject</label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="text"
                                            value={editForm.subject}
                                            onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:text-gray-100 font-medium"
                                            placeholder="Subject"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Keywords</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        type="text"
                                        value={editForm.keywords}
                                        onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:text-gray-100 font-medium"
                                        placeholder="Keywords (comma separated)"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={handleUpdateMeta}
                                    className="flex-1 bg-brand-600 text-white font-bold py-3 rounded-xl hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    Save
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-800 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-2">{pdf.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Registry ID: {pdf._id}</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                                    <User className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-0.5">Author / Contributor</span>
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{pdf.metadata?.author || 'Not specified'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border border-gray-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Subject</span>
                                        <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{pdf.metadata?.subject || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-gray-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Pages</span>
                                        <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{pdf.numPages} pages</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-gray-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">Keywords</span>
                                    <div className="flex flex-wrap gap-2">
                                        {pdf.metadata?.keywords ? pdf.metadata.keywords.split(',').map((kw, i) => (
                                            <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-full text-[11px] font-bold">
                                                #{kw.trim()}
                                            </span>
                                        )) : <span className="text-sm font-medium text-gray-400 italic">No keywords assigned</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 dark:border-zinc-900 grid grid-cols-2 gap-6">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">File Size</span>
                                    <p className="font-bold text-gray-700 dark:text-gray-300">{(pdf.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Uploaded On</span>
                                    <p className="font-bold text-gray-700 dark:text-gray-300">{new Date(pdf.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {pdf.isSearchable && (
                                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Searchable Document</p>
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-500/80">This document has been fully indexed for search.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MetadataModal;
