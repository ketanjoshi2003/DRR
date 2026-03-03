const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Pdf = require('../models/Pdf');
const User = require('../models/User');
const Course = require('../models/Course');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const { protect, authorize } = require('../middleware/auth.middleware');

const buildPdfScopeQuery = ({ courseCode, subjectCode, pdfId }) => {
    const query = {};
    if (pdfId) query._id = pdfId;
    else if (subjectCode) query.subjectCode = subjectCode;
    else if (courseCode) query.courseCode = courseCode;
    return Object.keys(query).length > 0 ? query : null;
};

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
router.get('/user-stats', protect, authorize('admin', 'teacher'), async (req, res) => {
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
                    courseCode: { $ifNull: ['$pdf.courseCode', ''] },
                    subjectCode: { $ifNull: ['$pdf.subjectCode', ''] },
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
router.get('/stats', protect, authorize('admin', 'teacher'), async (req, res) => {
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
                    courseCode: { $ifNull: ['$pdf.courseCode', ''] },
                    subjectCode: { $ifNull: ['$pdf.subjectCode', ''] },
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

// @desc    Get All User Notes for Analytics
// @route   GET /api/analytics/notes
// @access  Admin, Teacher
router.get('/notes', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const notes = await Note.find({})
            .populate('user', 'name email')
            .populate('pdf', 'title originalName')
            .sort('-createdAt')
            .lean();
        res.json(notes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});
// @desc    Get System Overview Counts
// @route   GET /api/analytics/overview
// @access  Admin
router.get('/overview', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const [userCount, courseCount, subjectCount, pdfCount] = await Promise.all([
            User.countDocuments(),
            Course.countDocuments(),
            Subject.countDocuments(),
            Pdf.countDocuments()
        ]);

        res.json({
            users: userCount,
            courses: courseCount,
            subjects: subjectCount,
            pdfs: pdfCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Reset all analytics data
// @route   DELETE /api/analytics/reset
// @access  Admin
router.delete('/reset', protect, authorize('admin'), async (req, res) => {
    try {
        await Session.deleteMany({});
        res.json({ message: 'Analytics data cleared successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get Inactive Users for specific material/subject/course
// @route   GET /api/analytics/inactive-users
// @access  Admin, Teacher
router.get('/inactive-users', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const pdfQuery = buildPdfScopeQuery(req.query);
        if (!pdfQuery) {
            return res.status(400).json({ message: 'Must provide courseCode, subjectCode, or pdfId' });
        }

        const pdfIds = await Pdf.find(pdfQuery).distinct('_id');
        const activeUserIds = await Session.find({ pdfId: { $in: pdfIds } }).distinct('userId');
        const inactiveUsers = await User.find({
            role: 'reader',
            _id: { $nin: activeUserIds }
        })
            .select('name email')
            .sort({ name: 1 });

        res.json(inactiveUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get Inactive Teachers for specific material/subject/course
// @route   GET /api/analytics/inactive-teachers
// @access  Admin
router.get('/inactive-teachers', protect, authorize('admin'), async (req, res) => {
    try {
        const pdfQuery = buildPdfScopeQuery(req.query);
        if (!pdfQuery) {
            return res.status(400).json({ message: 'Must provide courseCode, subjectCode, or pdfId' });
        }

        const activeTeacherIds = await Pdf.find({
            ...pdfQuery,
            uploadedBy: { $exists: true, $ne: null }
        }).distinct('uploadedBy');

        const inactiveTeachers = await User.find({
            role: 'teacher',
            _id: { $nin: activeTeacherIds }
        })
            .select('name email')
            .sort({ name: 1 });

        res.json(inactiveTeachers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get Teacher Analytics (what teachers upload, views, dates, durations)
// @route   GET /api/analytics/teacher-stats
// @access  Admin
router.get('/teacher-stats', protect, authorize('admin'), async (req, res) => {
    try {
        // Get all teachers
        const teachers = await User.find({ role: 'teacher' }).select('-password').lean();

        const teacherStats = await Promise.all(teachers.map(async (teacher) => {
            // Get all PDFs uploaded by this teacher
            const uploads = await Pdf.find({ uploadedBy: teacher._id }).lean();
            const pdfIds = uploads.map(p => p._id);

            // Get all sessions for these PDFs
            const sessions = await Session.find({ pdfId: { $in: pdfIds } })
                .populate('userId', 'name email')
                .sort('-startTime')
                .lean();

            // Per-material stats
            const materialStats = uploads.map(pdf => {
                const pdfSessions = sessions.filter(s => s.pdfId.toString() === pdf._id.toString());
                const uniqueUsers = [...new Set(pdfSessions.map(s => s.userId?._id?.toString()).filter(Boolean))];
                const totalDuration = pdfSessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0);

                return {
                    pdfId: pdf._id,
                    title: pdf.title,
                    originalName: pdf.originalName,
                    courseCode: pdf.courseCode || '',
                    subjectCode: pdf.subjectCode || '',
                    uploadDate: pdf.createdAt,
                    totalSessions: pdfSessions.length,
                    uniqueReaders: uniqueUsers.length,
                    totalDuration,
                    recentSessions: pdfSessions.slice(0, 10).map(s => ({
                        userName: s.userId?.name || 'Unknown',
                        userEmail: s.userId?.email || '',
                        startTime: s.startTime,
                        endTime: s.endTime,
                        duration: s.totalDuration || 0
                    }))
                };
            });

            const totalSessions = sessions.length;
            const totalDuration = sessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0);
            const uniqueReaders = [...new Set(sessions.map(s => s.userId?._id?.toString()).filter(Boolean))];

            return {
                teacherId: teacher._id,
                teacherName: teacher.name,
                teacherEmail: teacher.email,
                totalUploads: uploads.length,
                totalSessions,
                totalDuration,
                uniqueReaders: uniqueReaders.length,
                materials: materialStats
            };
        }));

        res.json(teacherStats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

module.exports = router;
