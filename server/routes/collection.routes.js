const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');

// @desc    Get user collection
// @route   GET /api/collection
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('collection.courses')
            .populate('collection.subjects')
            .populate('collection.pdfs');
        res.json(user.collection || { courses: [], subjects: [], pdfs: [] });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Add item to collection
// @route   POST /api/collection/add
// @access  Private
router.post('/add', protect, async (req, res) => {
    const { type, id } = req.body;
    try {
        if (!['courses', 'subjects', 'pdfs'].includes(type)) {
            return res.status(400).json({ message: 'Invalid type' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $addToSet: { [`collection.${type}`]: id } },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.collection);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Remove item from collection
// @route   POST /api/collection/remove
// @access  Private
router.post('/remove', protect, async (req, res) => {
    const { type, id } = req.body;
    try {
        if (!['courses', 'subjects', 'pdfs'].includes(type)) {
            return res.status(400).json({ message: 'Invalid type' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $pull: { [`collection.${type}`]: id } },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.collection);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
