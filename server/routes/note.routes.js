const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { protect } = require('../middleware/auth.middleware');

// Get notes for a specific PDF (for the logged-in user)
router.get('/:pdfId', protect, async (req, res) => {
    try {
        const notes = await Note.find({
            user: req.user._id,
            pdf: req.params.pdfId
        }).sort({ pageNumber: 1, createdAt: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new note
router.post('/', protect, async (req, res) => {
    const { pdfId, selectedText, noteContent, pageNumber, color } = req.body;
    try {
        const newNote = new Note({
            user: req.user._id,
            pdf: pdfId,
            selectedText,
            noteContent,
            pageNumber,
            color
        });
        const savedNote = await newNote.save();
        res.status(201).json(savedNote);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a note
router.delete('/:id', protect, async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!note) return res.status(404).json({ message: 'Note not found' });
        res.json({ message: 'Note deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
