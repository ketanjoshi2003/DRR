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

// @desc    Upload PDF
// @route   POST /api/pdfs/upload
// @access  Admin
router.post('/upload', protect, authorize('admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const pdf = await Pdf.create({
            title: req.body.title || req.file.originalname,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            uploadedBy: req.user._id
        });

        res.status(201).json(pdf);
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

module.exports = router;
