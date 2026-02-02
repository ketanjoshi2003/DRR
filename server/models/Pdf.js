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
    // Extracted metadata
    metadata: {
        author: String,
        subject: String,
        creator: String,
        keywords: String,
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
