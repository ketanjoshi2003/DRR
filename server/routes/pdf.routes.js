const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Pdf = require('../models/Pdf');
const { protect, authorize } = require('../middleware/auth.middleware');

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env.UPLOAD_PATH || 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Import PDF processor
const { processUploadedPDF, generateTitle } = require('../utils/pdfProcessor');

// @desc    Upload PDF with metadata extraction and OCR
// @route   POST /api/pdfs/upload
// @access  Admin
router.post('/upload', protect, authorize('admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', req.file.filename);

        // Process PDF asynchronously
        let processedData = null;
        try {
            processedData = await processUploadedPDF(filePath, {
                performOCRIfNeeded: true,
                ocrMaxPages: 5
            });
        } catch (processingError) {
            console.error('PDF processing error:', processingError);
            // Continue with upload even if processing fails
        }

        // Auto-generate title if not provided
        const title = req.body.title ||
            (processedData ? generateTitle(processedData, req.file.originalname) : req.file.originalname);

        const pdf = await Pdf.create({
            title: title,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            uploadedBy: req.user._id,
            // Metadata from PDF
            metadata: processedData?.metadata || {},
            extractedText: processedData?.content?.text || '',
            ocrText: processedData?.ocr?.ocrText || '',
            isSearchable: processedData?.isSearchable || false,
            numPages: processedData?.content?.numPages || 0,
            processed: !!processedData,
            processingError: processedData ? null : 'Failed to process PDF'
        });

        res.status(201).json({
            ...pdf.toObject(),
            processingInfo: {
                metadataExtracted: !!processedData?.metadata,
                ocrPerformed: !!processedData?.ocr,
                isSearchable: pdf.isSearchable
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Bulk Upload PDFs with drag-and-drop support
// @route   POST /api/pdfs/bulk-upload
// @access  Admin
router.post('/bulk-upload', protect, authorize('admin'), upload.array('files', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one file' });
        }

        const results = {
            successful: [],
            failed: []
        };

        // Process each file
        for (const file of req.files) {
            try {
                const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', file.filename);

                // Process PDF
                let processedData = null;
                try {
                    processedData = await processUploadedPDF(filePath, {
                        performOCRIfNeeded: true,
                        ocrMaxPages: 3 // Reduced for bulk processing
                    });
                } catch (processingError) {
                    console.error(`Processing error for ${file.originalname}:`, processingError);
                }

                // Auto-generate title
                const title = processedData ? generateTitle(processedData, file.originalname) : file.originalname;

                const pdf = await Pdf.create({
                    title: title,
                    filename: file.filename,
                    originalName: file.originalname,
                    size: file.size,
                    uploadedBy: req.user._id,
                    metadata: processedData?.metadata || {},
                    extractedText: processedData?.content?.text || '',
                    ocrText: processedData?.ocr?.ocrText || '',
                    isSearchable: processedData?.isSearchable || false,
                    numPages: processedData?.content?.numPages || 0,
                    processed: !!processedData
                });

                results.successful.push({
                    originalName: file.originalname,
                    title: title,
                    pdfId: pdf._id,
                    processed: !!processedData
                });
            } catch (error) {
                console.error(`Failed to process ${file.originalname}:`, error);
                results.failed.push({
                    originalName: file.originalname,
                    error: error.message
                });
            }
        }

        res.status(201).json({
            message: `Bulk upload completed: ${results.successful.length} successful, ${results.failed.length} failed`,
            results
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get all PDFs
// @route   GET /api/pdfs
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const pdfs = await Pdf.find().populate('uploadedBy', 'name email').sort('-createdAt');
        res.json(pdfs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get single PDF details
// @route   GET /api/pdfs/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const pdf = await Pdf.findById(req.params.id).populate('uploadedBy', 'name');

        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        res.json(pdf);
    } catch (error) {
        // If ID is invalid (CastError), return 404
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'PDF not found' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Stream PDF
// @route   GET /api/pdfs/:id/stream
// @access  Private
router.get('/:id/stream', protect, async (req, res) => {
    try {
        const pdf = await Pdf.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', pdf.filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'application/pdf',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'application/pdf',
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Batch Delete PDFs
// @route   DELETE /api/pdfs
// @access  Admin
router.delete('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { ids } = req.body;

        if (ids && Array.isArray(ids) && ids.length > 0) {
            // Find PDFs to get filenames
            const pdfsToDelete = await Pdf.find({ _id: { $in: ids } });

            // Delete files
            pdfsToDelete.forEach(pdf => {
                const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', pdf.filename);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (err) {
                        console.error(`Failed to delete file: ${filePath}`, err);
                    }
                }
            });

            // Delete DB records
            await Pdf.deleteMany({ _id: { $in: ids } });
            res.json({ message: 'Selected PDFs deleted successfully' });
        } else {
            res.status(400).json({ message: 'No IDs provided for deletion' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Delete PDF
// @route   DELETE /api/pdfs/:id
// @access  Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const pdf = await Pdf.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        // Delete file from filesystem
        const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', pdf.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await Pdf.deleteOne({ _id: req.params.id });
        res.json({ message: 'PDF removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Update PDF metadata
// @route   PUT /api/pdfs/:id
// @access  Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, metadata } = req.body;
        const pdf = await Pdf.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        if (title) pdf.title = title;
        if (metadata) {
            pdf.metadata = {
                ...pdf.metadata,
                ...metadata
            };
        }

        await pdf.save();
        res.json(pdf);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

module.exports = router;
