const mongoose = require('mongoose');

const PdfSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['pdf', 'epub', 'doc', 'image', 'audio', 'video', 'other'],
        default: 'pdf'
    },
    // Access Control
    accessControl: {
        isProtected: { type: Boolean, default: false },
        allowDownload: { type: Boolean, default: true },
        viewOnly: { type: Boolean, default: false },
        watermark: { type: String, default: '' },
        timeLimit: { type: Number, default: 0 }, // in minutes
        allowedInstitutes: [String],
        allowedIps: [String],
        concurrentLimit: { type: Number, default: 0 } // 0 means no limit
    },
    // Versioning
    version: { type: Number, default: 1 },
    parentDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Pdf' },
    // Extracted metadata
    metadata: {
        author: String,
        subject: String,
        creator: String,
        keywords: String,
        year: Number,
        language: String,
        creationDate: String,
        modificationDate: String
    },
    // Content and search
    extractedText: {
        type: String,
        default: ''
    },
    ocrText: {
        type: String,
        default: ''
    },
    isSearchable: {
        type: Boolean,
        default: false
    },
    numPages: {
        type: Number,
        default: 0
    },
    // Processing status
    processed: {
        type: Boolean,
        default: false
    },
    processingError: String
}, { timestamps: true });

module.exports = mongoose.model('Pdf', PdfSchema);
