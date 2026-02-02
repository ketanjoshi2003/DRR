import { useState, useEffect } from 'react';
import { Info, X, Edit2, Save, CheckCircle } from 'lucide-react';
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

    if (!isOpen || !pdf) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => { if (!isEditing) onClose() }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-brand-600">
                        <Info className="w-5 h-5" />
                        <h2 className="text-lg font-bold text-gray-900">Document Information</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-all"
                                title="Edit Metadata"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={() => { onClose(); setIsEditing(false); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Document Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm font-medium"
                                    placeholder="Enter title"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Author</label>
                                    <input
                                        type="text"
                                        value={editForm.author}
                                        onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm font-medium"
                                        placeholder="Author name"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={editForm.subject}
                                        onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm font-medium"
                                        placeholder="Subject"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Keywords</label>
                                <input
                                    type="text"
                                    value={editForm.keywords}
                                    onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all text-sm font-medium"
                                    placeholder="Keywords (comma separated)"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleUpdateMeta}
                                    className="flex-1 bg-brand-600 text-white font-bold py-2.5 rounded-lg hover:bg-brand-700 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-lg hover:bg-gray-200 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 leading-tight mb-4 tracking-tight">{pdf.title}</h3>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-12 text-sm">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Author</span>
                                        <p className="font-semibold text-gray-700">{pdf.metadata?.author || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject</span>
                                        <p className="font-semibold text-gray-700">{pdf.metadata?.subject || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Keywords</span>
                                        <p className="font-semibold text-gray-700 italic">{pdf.metadata?.keywords || 'None'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pages</span>
                                        <p className="font-semibold text-gray-700">{pdf.numPages} pages</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">File Properties</h4>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-12 text-sm">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">File Size</span>
                                        <p className="font-semibold text-gray-700">{(pdf.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Added On</span>
                                        <p className="font-semibold text-gray-700">{new Date(pdf.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Uploader</span>
                                        <p className="font-semibold text-gray-700 text-brand-600">{pdf.uploadedBy?.name || 'System'}</p>
                                    </div>
                                </div>
                            </div>

                            {pdf.isSearchable && (
                                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-lg text-xs flex items-center gap-3 font-medium">
                                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span>This document has been fully indexed and is searchable {pdf.ocrText ? '(OCR Enhanced)' : ''}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MetadataModal;
