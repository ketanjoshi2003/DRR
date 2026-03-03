const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const Session = require('../models/Session');
const Pdf = require('../models/Pdf');
const User = require('../models/User');
const Course = require('../models/Course');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const { protect, authorize } = require('../middleware/auth.middleware');

// ─── Logo image (pre-rendered PNG from SVG) ──────────────────────
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');

// ─── Colour palette ───────────────────────────────────────────────
const BRAND = '#2563EB';   // blue-600
const BRAND_L = '#DBEAFE';   // blue-100
const DARK = '#111827';   // gray-900
const MEDIUM = '#6B7280';   // gray-500
const LIGHT = '#F3F4F6';   // gray-100
const WHITE = '#FFFFFF';
const AMBER = '#D97706';
const GREEN = '#059669';
const APP_NAME = 'Digital Reading Room';

// ─── Helpers ──────────────────────────────────────────────────────

/** Draw a filled rectangle */
const rect = (doc, x, y, w, h, color) => {
    doc.save().rect(x, y, w, h).fill(color).restore();
};

/** Right-align text inside a cell */
const rightText = (doc, text, x, y, w, opts = {}) => {
    doc.text(text, x, y, { width: w, align: 'right', ...opts });
};

/** Format seconds → human-readable */
const fmtDuration = (sec) => {
    if (!sec || sec < 0) return '0m';
    if (sec < 60) return `${Math.round(sec)}s`;
    if (sec < 3600) return `${(sec / 60).toFixed(1)}m`;
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return `${h}h ${m}m`;
};

/** Truncate long strings */
const trunc = (str, max = 40) => {
    if (!str) return '';
    return str.length > max ? str.substring(0, max - 1) + '…' : str;
};

/** Add page number footer */
const addFooter = (doc) => {
    const bottom = doc.page.height - doc.page.margins.bottom - 22;
    doc.save()
        .fontSize(8)
        .fillColor(MEDIUM)
        .text(
            `Generated on ${new Date().toLocaleString()} — Digital Reading Room`,
            50,
            bottom,
            { width: doc.page.width - 100, align: 'center' }
        )
        .restore();
};

/** Embed the app logo PNG in the PDF.
 *  Uses a pre-rendered PNG (from client/public/logo.svg) so gradients
 *  and all visual details are preserved exactly as in the app.
 */
const drawAppLogo = (doc, x, y, size = 36) => {
    try {
        if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, x, y, { width: size, height: size });
        }
    } catch (err) {
        console.warn('Could not embed logo in PDF:', err.message);
    }
};

/** Draw common cover header with app branding */
const drawCoverHeader = (doc, title, bgColor, subtitleColor) => {
    rect(doc, 0, 0, doc.page.width, 120, bgColor);
    drawAppLogo(doc, 50, 33, 34);

    const reportDate = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    doc.save()
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(subtitleColor)
        .text(APP_NAME, 94, 33, { lineBreak: false })
        .fontSize(24)
        .fillColor(WHITE)
        .text(title, 94, 48, { lineBreak: false })
        .font('Helvetica')
        .fontSize(10)
        .fillColor(subtitleColor)
        .text(reportDate, 94, 80, { lineBreak: false })
        .restore();
};

/** Draw a styled section header */
const sectionHeader = (doc, title, y) => {
    rect(doc, 50, y, doc.page.width - 100, 28, BRAND);
    doc.save()
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(WHITE)
        .text(title, 60, y + 8, { width: doc.page.width - 120 })
        .restore();
    return y + 36;
};

/** Draw a table header row */
const tableHeader = (doc, columns, y) => {
    const pageW = doc.page.width - 100;
    rect(doc, 50, y, pageW, 22, LIGHT);
    doc.save().fontSize(8).font('Helvetica-Bold').fillColor(DARK);
    let x = 58;
    columns.forEach(col => {
        if (col.align === 'right') {
            rightText(doc, col.label, x, y + 7, col.width);
        } else {
            doc.text(col.label, x, y + 7, { width: col.width });
        }
        x += col.width;
    });
    doc.restore();
    return y + 24;
};

/** Draw a table data row (alternating bg) */
const tableRow = (doc, columns, values, y, isAlt) => {
    const pageW = doc.page.width - 100;
    if (isAlt) rect(doc, 50, y, pageW, 20, '#F9FAFB');
    doc.save().fontSize(8).font('Helvetica').fillColor(DARK);
    let x = 58;
    columns.forEach((col, i) => {
        const val = String(values[i] ?? '');
        if (col.align === 'right') {
            rightText(doc, val, x, y + 6, col.width);
        } else {
            doc.text(val, x, y + 6, { width: col.width, lineBreak: false });
        }
        x += col.width;
    });
    doc.restore();
    return y + 20;
};

/** Check if we need a new page — uses the manually tracked y position */
const ensureSpace = (doc, y, needed = 60) => {
    // Leave at least bottom margin (40) + needed space
    if (y + needed > doc.page.height - 60) {
        doc.addPage();
        return doc.page.margins.top;
    }
    return y;
};

/** Draw a stat card */
const statCard = (doc, x, y, w, h, label, value, accent = BRAND) => {
    // Card bg
    doc.save()
        .roundedRect(x, y, w, h, 6)
        .fill(WHITE)
        .restore();
    // Border
    doc.save()
        .roundedRect(x, y, w, h, 6)
        .lineWidth(1)
        .strokeColor('#E5E7EB')
        .stroke()
        .restore();
    // Accent bar
    rect(doc, x, y, 4, h, accent);
    // Value
    doc.save()
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor(DARK)
        .text(String(value), x + 16, y + 10, { width: w - 24 })
        .restore();
    // Label
    doc.save()
        .fontSize(8)
        .font('Helvetica')
        .fillColor(MEDIUM)
        .text(label.toUpperCase(), x + 16, y + 36, { width: w - 24 })
        .restore();
};

// ──────────────────────────────────────────────────────────────────
// @desc    Generate Student Analytics PDF Report
// @route   GET /api/reports/student-pdf
// @access  Admin / Teacher
// ──────────────────────────────────────────────────────────────────
router.get('/student-pdf', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        // ── Fetch data (same aggregations as analytics routes) ──
        const [fileStats, userStats, overviewCounts, notesData] = await Promise.all([
            Session.aggregate([
                { $group: { _id: '$pdfId', totalSessions: { $sum: 1 }, totalDuration: { $sum: '$totalDuration' }, uniqueUsers: { $addToSet: '$userId' } } },
                { $lookup: { from: 'pdfs', localField: '_id', foreignField: '_id', as: 'pdf' } },
                { $unwind: { path: '$pdf', preserveNullAndEmptyArrays: true } },
                { $project: { title: { $ifNull: ['$pdf.title', 'Unknown PDF'] }, totalSessions: 1, totalDuration: 1, uniqueUsersCount: { $size: '$uniqueUsers' } } },
                { $sort: { totalSessions: -1 } }
            ]),
            Session.aggregate([
                { $group: { _id: { userId: '$userId', pdfId: '$pdfId' }, totalSessions: { $sum: 1 }, totalDuration: { $sum: '$totalDuration' }, lastAccess: { $max: '$startTime' } } },
                { $lookup: { from: 'users', localField: '_id.userId', foreignField: '_id', as: 'user' } },
                { $lookup: { from: 'pdfs', localField: '_id.pdfId', foreignField: '_id', as: 'pdf' } },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$pdf', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        userName: { $ifNull: ['$user.name', 'Unknown'] },
                        userEmail: { $ifNull: ['$user.email', 'N/A'] },
                        pdfTitle: { $ifNull: ['$pdf.title', 'Unknown PDF'] },
                        totalSessions: 1, totalDuration: 1, lastAccess: 1
                    }
                },
                { $sort: { lastAccess: -1 } }
            ]),
            Promise.all([
                User.countDocuments(),
                Course.countDocuments(),
                Subject.countDocuments(),
                Pdf.countDocuments()
            ]),
            Note.find({})
                .populate('user', 'name email')
                .populate('pdf', 'title originalName')
                .sort('-createdAt')
                .lean()
        ]);

        const [userCount, courseCount, subjectCount, pdfCount] = overviewCounts;

        // ── Build PDF ───────────────────────────────────────────
        const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 20, left: 50, right: 50 }, bufferPages: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="student-analytics-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
        doc.pipe(res);

        // ── Cover header ────────────────────────────────────────
        drawCoverHeader(doc, 'Student Analytics Report', BRAND, '#BFDBFE');

        // ── Overview cards ──────────────────────────────────────
        let y = 140;
        const cardW = (doc.page.width - 100 - 30) / 4;
        statCard(doc, 50, y, cardW, 52, 'Total Users', userCount, BRAND);
        statCard(doc, 50 + cardW + 10, y, cardW, 52, 'Active Courses', courseCount, '#7C3AED');
        statCard(doc, 50 + (cardW + 10) * 2, y, cardW, 52, 'Total Subjects', subjectCount, GREEN);
        statCard(doc, 50 + (cardW + 10) * 3, y, cardW, 52, 'PDF Documents', pdfCount, AMBER);
        y = 210;

        // ── File Performance Table ──────────────────────────────
        y = sectionHeader(doc, 'File Performance', y);
        const fileCols = [
            { label: 'PDF Title', width: 240 },
            { label: 'Sessions', width: 70, align: 'right' },
            { label: 'Unique Users', width: 80, align: 'right' },
            { label: 'Total Duration', width: 100, align: 'right' }
        ];
        y = tableHeader(doc, fileCols, y);

        fileStats.forEach((s, i) => {
            y = ensureSpace(doc, y, 25);
            if (y === doc.page.margins.top) {
                y = tableHeader(doc, fileCols, y);
            }
            y = tableRow(doc, fileCols, [
                trunc(s.title, 50),
                s.totalSessions,
                s.uniqueUsersCount,
                fmtDuration(s.totalDuration)
            ], y, i % 2 === 0);
        });

        if (fileStats.length === 0) {
            y += 10;
            doc.save().fontSize(9).fillColor(MEDIUM).text('No file activity recorded.', 60, y).restore();
            y += 20;
        }

        // ── User Activity Table ─────────────────────────────────
        y += 16;
        y = ensureSpace(doc, y, 80);
        y = sectionHeader(doc, 'User Activity', y);
        const userCols = [
            { label: 'User', width: 120 },
            { label: 'Email', width: 140 },
            { label: 'PDF Title', width: 130 },
            { label: 'Duration', width: 80, align: 'right' }
        ];
        y = tableHeader(doc, userCols, y);

        userStats.forEach((s, i) => {
            y = ensureSpace(doc, y, 25);
            if (y === doc.page.margins.top) {
                y = tableHeader(doc, userCols, y);
            }
            y = tableRow(doc, userCols, [
                trunc(s.userName, 22),
                trunc(s.userEmail, 26),
                trunc(s.pdfTitle, 24),
                fmtDuration(s.totalDuration)
            ], y, i % 2 === 0);
        });

        if (userStats.length === 0) {
            y += 10;
            doc.save().fontSize(9).fillColor(MEDIUM).text('No user activity recorded.', 60, y).restore();
        }

        // ── User Notes Table ────────────────────────────────────
        y += 16;
        y = ensureSpace(doc, y, 80);
        y = sectionHeader(doc, 'User Notes', y);
        const noteCols = [
            { label: 'User', width: 110 },
            { label: 'PDF Title', width: 120 },
            { label: 'Pg', width: 30 },
            { label: 'Note Content', width: 210 }
        ];
        y = tableHeader(doc, noteCols, y);

        notesData.forEach((n, i) => {
            y = ensureSpace(doc, y, 25);
            if (y === doc.page.margins.top) {
                y = tableHeader(doc, noteCols, y);
            }
            const userName = n.user?.name || 'Unknown';
            const pdfName = n.pdf?.title || n.pdf?.originalName || 'Unknown';
            y = tableRow(doc, noteCols, [
                trunc(userName, 18),
                trunc(pdfName, 20),
                String(n.pageNumber || '-'),
                trunc(n.noteContent, 40)
            ], y, i % 2 === 0);
        });

        if (notesData.length === 0) {
            y += 10;
            doc.save().fontSize(9).fillColor(MEDIUM).text('No user notes recorded.', 60, y).restore();
        }

        // ── Footers on every page ───────────────────────────────
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            addFooter(doc);
            // Page number
            doc.save()
                .fontSize(8)
                .fillColor(MEDIUM)
                .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - doc.page.margins.bottom - 10, { width: doc.page.width - 100, align: 'right', lineBreak: false })
                .restore();
        }

        doc.end();
    } catch (error) {
        console.error('Student PDF report error:', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
});

// ──────────────────────────────────────────────────────────────────
// @desc    Generate Teacher Analytics PDF Report
// @route   GET /api/reports/teacher-pdf
// @access  Admin
// ──────────────────────────────────────────────────────────────────
router.get('/teacher-pdf', protect, authorize('admin'), async (req, res) => {
    try {
        // ── Fetch teacher data ──────────────────────────────────
        const teachers = await User.find({ role: 'teacher' }).select('-password').lean();

        const teacherStats = await Promise.all(teachers.map(async (teacher) => {
            const uploads = await Pdf.find({ uploadedBy: teacher._id }).lean();
            const pdfIds = uploads.map(p => p._id);
            const sessions = await Session.find({ pdfId: { $in: pdfIds } })
                .populate('userId', 'name email')
                .sort('-startTime')
                .lean();

            const materialStats = uploads.map(pdf => {
                const pdfSessions = sessions.filter(s => s.pdfId.toString() === pdf._id.toString());
                const uniqueUsers = [...new Set(pdfSessions.map(s => s.userId?._id?.toString()).filter(Boolean))];
                const totalDuration = pdfSessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0);
                return {
                    title: pdf.title,
                    courseCode: pdf.courseCode || '-',
                    subjectCode: pdf.subjectCode || '-',
                    uploadDate: pdf.createdAt,
                    totalSessions: pdfSessions.length,
                    uniqueReaders: uniqueUsers.length,
                    totalDuration,
                    recentSessions: pdfSessions.slice(0, 5).map(s => ({
                        userName: s.userId?.name || 'Unknown',
                        userEmail: s.userId?.email || '',
                        startTime: s.startTime,
                        duration: s.totalDuration || 0
                    }))
                };
            });

            const totalSessions = sessions.length;
            const totalDuration = sessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0);
            const uniqueReaders = [...new Set(sessions.map(s => s.userId?._id?.toString()).filter(Boolean))];

            return {
                teacherName: teacher.name,
                teacherEmail: teacher.email,
                totalUploads: uploads.length,
                totalSessions,
                totalDuration,
                uniqueReaders: uniqueReaders.length,
                materials: materialStats
            };
        }));

        // ── Build PDF ───────────────────────────────────────────
        const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 20, left: 50, right: 50 }, bufferPages: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="teacher-analytics-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
        doc.pipe(res);

        // ── Cover header ────────────────────────────────────────
        drawCoverHeader(doc, 'Teacher Analytics Report', AMBER, '#FEF3C7');

        // ── Teacher Summary Table ───────────────────────────────
        let y = 140;
        y = sectionHeader(doc, 'Teacher Summary', y);
        const summaryCols = [
            { label: 'Teacher', width: 120 },
            { label: 'Email', width: 140 },
            { label: 'Uploads', width: 55, align: 'right' },
            { label: 'Sessions', width: 55, align: 'right' },
            { label: 'Readers', width: 55, align: 'right' },
            { label: 'Read Time', width: 70, align: 'right' }
        ];
        y = tableHeader(doc, summaryCols, y);

        teacherStats.forEach((t, i) => {
            y = ensureSpace(doc, y, 25);
            if (y === doc.page.margins.top) y = tableHeader(doc, summaryCols, y);
            y = tableRow(doc, summaryCols, [
                trunc(t.teacherName, 22),
                trunc(t.teacherEmail, 26),
                t.totalUploads,
                t.totalSessions,
                t.uniqueReaders,
                fmtDuration(t.totalDuration)
            ], y, i % 2 === 0);
        });

        if (teacherStats.length === 0) {
            y += 10;
            doc.save().fontSize(9).fillColor(MEDIUM).text('No teacher data available.', 60, y).restore();
            y += 20;
        }

        // ── Per-teacher material breakdown ──────────────────────
        teacherStats.forEach(teacher => {
            if (teacher.materials.length === 0) return;
            y += 20;
            y = ensureSpace(doc, y, 80);

            // Teacher sub-header
            rect(doc, 50, y, doc.page.width - 100, 24, '#FEF3C7');
            doc.save()
                .fontSize(10)
                .font('Helvetica-Bold')
                .fillColor('#92400E')
                .text(`${teacher.teacherName}  —  ${teacher.teacherEmail}`, 60, y + 7)
                .restore();
            y += 32;

            const matCols = [
                { label: 'Material', width: 150 },
                { label: 'Course', width: 60 },
                { label: 'Subject', width: 60 },
                { label: 'Uploaded', width: 75 },
                { label: 'Sessions', width: 50, align: 'right' },
                { label: 'Readers', width: 50, align: 'right' },
                { label: 'Duration', width: 55, align: 'right' }
            ];
            y = tableHeader(doc, matCols, y);

            teacher.materials.forEach((m, i) => {
                y = ensureSpace(doc, y, 25);
                if (y === doc.page.margins.top) y = tableHeader(doc, matCols, y);
                y = tableRow(doc, matCols, [
                    trunc(m.title, 28),
                    trunc(m.courseCode, 10),
                    trunc(m.subjectCode, 10),
                    new Date(m.uploadDate).toLocaleDateString('en-IN'),
                    m.totalSessions,
                    m.uniqueReaders,
                    fmtDuration(m.totalDuration)
                ], y, i % 2 === 0);
            });
        });

        // ── Footers on every page ───────────────────────────────
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            addFooter(doc);
            doc.save()
                .fontSize(8)
                .fillColor(MEDIUM)
                .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - doc.page.margins.bottom - 10, { width: doc.page.width - 100, align: 'right', lineBreak: false })
                .restore();
        }

        doc.end();
    } catch (error) {
        console.error('Teacher PDF report error:', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
});

module.exports = router;
