import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { FileText, Clock } from 'lucide-react';

const PDFList = () => {
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPdfs = async () => {
            try {
                const { data } = await api.get('/pdfs');
                setPdfs(data);
            } catch (error) {
                console.error('Error fetching PDFs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPdfs();
    }, []);

    if (loading) return <div>Loading library...</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Digital Library</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pdfs.map((pdf) => (
                    <div key={pdf._id} className="bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 transform-gpu">
                        <div className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="p-3 bg-brand-50 rounded-lg">
                                    <FileText className="w-8 h-8 text-brand-600" />
                                </div>
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-gray-900 truncate" title={pdf.title}>
                                {pdf.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {pdf.uploadedBy?.name || 'Unknown Author'}
                            </p>
                            <div className="mt-4 flex items-center text-xs text-gray-400 gap-4">
                                <span className="flex items-center gap-1">
                                    {(pdf.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(pdf.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <Link
                                to={`/read/${pdf._id}`}
                                className="mt-4 w-full block text-center py-2 px-4 border border-brand-600 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                            >
                                Read Now
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
            {pdfs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No PDFs available. Ask an admin to upload some.
                </div>
            )}
        </div>
    );
};

export default PDFList;
