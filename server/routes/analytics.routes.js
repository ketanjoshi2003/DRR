const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Pdf = require('../models/Pdf');
const { protect, authorize } = require('../middleware/auth.middleware');

// @desc    Start unique reading session
// @route   POST /api/analytics/session/start
// @access  Private
router.post('/session/start', protect, async (req, res) => {
    const { pdfId } = req.body;
    try {
        const session = await Session.create({
            userId: req.user._id,
            pdfId
        });
        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Update session (heartbeat)
// @route   POST /api/analytics/session/update
// @access  Private
router.post('/session/update', protect, async (req, res) => {
    const { sessionId, pageNumber, duration, totalDuration } = req.body;

    try {
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Update total duration
        if (totalDuration) {
            session.totalDuration = totalDuration;
        } else if (duration) {
            session.totalDuration = (session.totalDuration || 0) + duration;
        }
        session.endTime = Date.now();

        // Update specific page visit if provided
        if (pageNumber) {
            // Check if page already visited in this session recently or create new entry
            // For simplicity, we just push a new visit entry or update the last one if it matches
            const lastVisit = session.pagesVisited[session.pagesVisited.length - 1];

            if (lastVisit && lastVisit.pageNumber === pageNumber) {
                // Update duration of current page view
                lastVisit.duration += duration || 0;
            } else {
                // New page visit
                session.pagesVisited.push({
                    pageNumber,
                    startTime: Date.now(),
                    duration: duration || 0
                });
            }
        }

        await session.save();
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get Detailed User Stats
// @route   GET /api/analytics/user-stats
// @access  Admin
router.get('/user-stats', protect, authorize('admin'), async (req, res) => {
    try {
        const stats = await Session.aggregate([
            {
                $group: {
                    _id: { userId: '$userId', pdfId: '$pdfId' },
                    totalSessions: { $sum: 1 },
                    totalDuration: { $sum: '$totalDuration' }, // in seconds
                    lastAccess: { $max: '$startTime' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $lookup: {
                    from: 'pdfs',
                    localField: '_id.pdfId',
                    foreignField: '_id',
                    as: 'pdf'
                }
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$pdf',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    userName: {
                        $ifNull: [
                            '$user.name', // Use 'name' field first (User model has 'name', not 'username')
                            { $arrayElemAt: [{ $split: ['$user.email', '@'] }, 0] }, // Fallback to email prefix
                            'Unknown User'
                        ]
                    },
                    userEmail: { $ifNull: ['$user.email', 'N/A'] },
                    pdfTitle: { $ifNull: ['$pdf.title', 'Unknown PDF'] },
                    pdfFilename: { $ifNull: ['$pdf.filename', 'unknown.pdf'] },
                    totalSessions: 1,
                    totalDuration: 1,
                    lastAccess: 1,
                    pdfId: '$_id.pdfId'
                }
            },
            {
                $sort: { lastAccess: -1 }
            }
        ]);

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get Admin Analytics
// @route   GET /api/analytics/stats
// @access  Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
    try {
        const stats = await Session.aggregate([
            {
                $group: {
                    _id: '$pdfId',
                    totalSessions: { $sum: 1 },
                    totalDuration: { $sum: '$totalDuration' },
                    uniqueUsers: { $addToSet: '$userId' }
                }
            },
            {
                $lookup: {
                    from: 'pdfs',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'pdf'
                }
            },
            {
                $unwind: {
                    path: '$pdf',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    title: { $ifNull: ['$pdf.title', 'Unknown PDF'] },
                    filename: { $ifNull: ['$pdf.filename', 'unknown.pdf'] },
                    totalSessions: 1,
                    totalDuration: 1,
                    uniqueUsersCount: { $size: '$uniqueUsers' }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get User History
// @route   GET /api/analytics/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.user._id })
            .populate('pdfId', 'title')
            .sort('-startTime');
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

module.exports = router;
