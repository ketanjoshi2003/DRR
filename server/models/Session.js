const mongoose = require('mongoose');

const PageVisitSchema = new mongoose.Schema({
    pageNumber: { type: Number, required: true },
    startTime: { type: Date, default: Date.now },
    duration: { type: Number, default: 0 } // duration in seconds
});

const SessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pdfId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pdf',
        required: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    totalDuration: {
        type: Number,
        default: 0
    },
    pagesVisited: [PageVisitSchema]
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
