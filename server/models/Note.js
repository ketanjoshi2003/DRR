const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pdf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pdf',
        required: true
    },
    selectedText: {
        type: String,
        required: true
    },
    noteContent: {
        type: String,
        required: true
    },
    pageNumber: {
        type: Number,
        required: true
    },
    color: {
        type: String,
        default: '#ffff00' // Default highlight color
    }
}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);
