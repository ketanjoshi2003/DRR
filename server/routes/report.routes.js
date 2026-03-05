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
const BRAND = '#1E3A5F';   // deep navy
const BRAND_L = '#E8EEF4';   // light blue-gray
const DARK = '#1A1A1A';   // near-black
const MEDIUM = '#5A5A5A';   // dark gray
const LIGHT = '#F5F5F5';   // off-white
const WHITE = '#FFFFFF';
const AMBER = '#B87333';   // copper/amber
const GREEN = '#2E7D32';   // forest green
const ACCENT = '#2563EB';   // blue accent
const BORDER = '#CCCCCC';   // border grey
const APP_NAME = 'Digital Reading Room';
const ORG_NAME = 'Digital Reading Room — Library Management System';

// ─── Standard Report Dimensions ───────────────────────────────────
const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 60;
const CONTENT_WIDTH = 595.28 - MARGIN_LEFT - MARGIN_RIGHT;  // A4 width minus margins
const ROW_HEIGHT = 20;
const HEADER_ROW_H = 24;

// ─── Helpers ──────────────────────────────────────────────────────

/** Draw a filled rectangle */
const rect = (doc, x, y, w, h, color) => {
    doc.save().rect(x, y, w, h).fill(color).restore();
};

/** Draw a line */
const line = (doc, x1, y1, x2, y2, color = BORDER, width = 0.5) => {
    doc.save().moveTo(x1, y1).lineTo(x2, y2).lineWidth(width).strokeColor(color).stroke().restore();
};

/** Right-align text inside a cell */
const rightText = (doc, text, x, y, w, opts = {}) => {
    doc.text(text, x, y, { width: w, align: 'right', ...opts });
};

/** Format seconds → human-readable */
const fmtDuration = (sec) => {
    if (!sec || sec < 0) return '0 min';
    if (sec < 60) return `${Math.round(sec)} sec`;
    if (sec < 3600) return `${(sec / 60).toFixed(1)} min`;
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return `${h} hr ${m} min`;
};

/** Truncate long strings */
const trunc = (str, max = 40) => {
    if (!str) return '—';
    return str.length > max ? str.substring(0, max - 1) + '…' : str;
};

/** Format date neatly */
const fmtDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

/** Generate report reference number */
const genRef = (prefix) => {
    const now = new Date();
    return `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
};

// ─── Standard Report Building Blocks ─────────────────────────────

/** Embed the app logo PNG in the PDF */
const drawLogo = (doc, x, y, size = 40) => {
    try {
        if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, x, y, { width: size, height: size });
        }
    } catch (err) {
        console.warn('Could not embed logo in PDF:', err.message);
    }
};

/** Draw running header on content pages */
const drawRunningHeader = (doc, reportTitle) => {
    const pageW = doc.page.width;
    const top = 20;

    // Thin top accent line
    line(doc, MARGIN_LEFT, top, pageW - MARGIN_RIGHT, top, BRAND, 1.5);

    // Left: Organization
    doc.save()
        .fontSize(7)
        .font('Helvetica')
        .fillColor(MEDIUM)
        .text(APP_NAME, MARGIN_LEFT, top + 5, { lineBreak: false })
        .restore();

    // Right: Report title
    doc.save()
        .fontSize(7)
        .font('Helvetica-Oblique')
        .fillColor(MEDIUM)
        .text(reportTitle, MARGIN_LEFT, top + 5, {
            width: pageW - MARGIN_LEFT - MARGIN_RIGHT,
            align: 'right',
            lineBreak: false
        })
        .restore();

    // Separator line after header
    line(doc, MARGIN_LEFT, top + 18, pageW - MARGIN_RIGHT, top + 18, BORDER, 0.5);
};

/** Draw running footer with page numbers */
const drawRunningFooter = (doc, pageNum, totalPages, refNumber) => {
    const pageW = doc.page.width;
    const bottom = doc.page.height - 35;
    const footerY = bottom + 6;

    // Separator line before footer
    line(doc, MARGIN_LEFT, bottom, pageW - MARGIN_RIGHT, bottom, BORDER, 0.5);

    // Left: Reference
    doc.save()
        .fontSize(7)
        .font('Helvetica')
        .fillColor(MEDIUM)
        .text(`Ref: ${refNumber}`, MARGIN_LEFT, footerY, { lineBreak: false })
        .restore();

    // Center: Confidential
    const centerText = 'CONFIDENTIAL — For Internal Use Only';
    doc.save()
        .fontSize(6.5)
        .font('Helvetica-Oblique')
        .fillColor('#999999');
    const centerTextWidth = doc.widthOfString(centerText);
    const centerX = (pageW - centerTextWidth) / 2;
    doc.text(centerText, centerX, footerY, { lineBreak: false })
        .restore();

    // Right: Page number
    const pageText = `Page ${pageNum} of ${totalPages}`;
    doc.save()
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor(DARK);
    const pageTextWidth = doc.widthOfString(pageText);
    const pageTextX = pageW - MARGIN_RIGHT - pageTextWidth;
    doc.text(pageText, pageTextX, footerY, { lineBreak: false })
        .restore();
};

/** Draw a full professional cover page */
const drawCoverPage = (doc, { title, subtitle, reportType, refNumber, preparedBy }) => {
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const reportDate = new Date();
    const dateStr = reportDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Top accent bar
    rect(doc, 0, 0, pageW, 6, BRAND);

    // Logo and org name (top section)
    drawLogo(doc, MARGIN_LEFT, 50, 48);

    doc.save()
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(BRAND)
        .text(APP_NAME, MARGIN_LEFT + 60, 55, { lineBreak: false })
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MEDIUM)
        .text('Library Management System', MARGIN_LEFT + 60, 75, { lineBreak: false })
        .restore();

    // Divider
    line(doc, MARGIN_LEFT, 110, pageW - MARGIN_RIGHT, 110, BRAND, 2);

    // Report title block (centered in the page)
    doc.save()
        .font('Helvetica')
        .fontSize(11)
        .fillColor(MEDIUM)
        .text(reportType.toUpperCase(), MARGIN_LEFT, 200, {
            width: CONTENT_WIDTH,
            align: 'center'
        })
        .font('Helvetica-Bold')
        .fontSize(28)
        .fillColor(BRAND)
        .text(title, MARGIN_LEFT, 225, {
            width: CONTENT_WIDTH,
            align: 'center',
            lineGap: 4
        })
        .restore();

    if (subtitle) {
        doc.save()
            .font('Helvetica')
            .fontSize(12)
            .fillColor(MEDIUM)
            .text(subtitle, MARGIN_LEFT, 275, {
                width: CONTENT_WIDTH,
                align: 'center'
            })
            .restore();
    }

    // Decorative line under title
    const centerX = pageW / 2;
    line(doc, centerX - 60, 305, centerX + 60, 305, BRAND, 1.5);

    // Report metadata box
    const metaBoxY = 380;
    const metaBoxW = 280;
    const metaBoxX = (pageW - metaBoxW) / 2;

    doc.save()
        .roundedRect(metaBoxX, metaBoxY, metaBoxW, 140, 4)
        .lineWidth(0.75)
        .strokeColor(BORDER)
        .stroke()
        .restore();

    // Metadata table content
    const metaItems = [
        ['Report Reference', refNumber],
        ['Date of Report', dateStr],
        ['Prepared By', preparedBy || 'System Administrator'],
        ['Classification', 'Internal / Confidential'],
        ['Status', 'Final']
    ];

    let metaY = metaBoxY + 14;
    metaItems.forEach(([label, value]) => {
        doc.save()
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor(DARK)
            .text(label + ':', metaBoxX + 20, metaY, { width: 100, lineBreak: false })
            .font('Helvetica')
            .fillColor(MEDIUM)
            .text(value, metaBoxX + 125, metaY, { width: 140, lineBreak: false })
            .restore();
        metaY += 22;
    });

    // Bottom section
    line(doc, MARGIN_LEFT, pageH - 80, pageW - MARGIN_RIGHT, pageH - 80, BRAND, 2);

    doc.save()
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor(MEDIUM)
        .text(
            `This report was automatically generated by ${APP_NAME} on ${dateStr}. ` +
            'Contents are based on data available at the time of generation.',
            MARGIN_LEFT, pageH - 70,
            { width: CONTENT_WIDTH, align: 'center', lineGap: 2 }
        )
        .restore();

    // Bottom accent bar
    rect(doc, 0, pageH - 6, pageW, 6, BRAND);
};

/** Draw a Table of Contents page */
const drawTableOfContents = (doc, sections) => {
    doc.addPage();
    const pageW = doc.page.width;

    let y = 60;

    // TOC title
    doc.save()
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor(BRAND)
        .text('Table of Contents', MARGIN_LEFT, y)
        .restore();

    y += 10;
    line(doc, MARGIN_LEFT, y + 20, pageW - MARGIN_RIGHT, y + 20, BRAND, 1);
    y += 35;

    sections.forEach((section) => {
        const isMain = !section.number.includes('.');
        const indent = isMain ? 0 : 20;

        doc.save()
            .font(isMain ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(isMain ? 10.5 : 9.5)
            .fillColor(isMain ? DARK : MEDIUM)
            .text(`${section.number}`, MARGIN_LEFT + indent, y, { width: 40, continued: false })
            .restore();

        doc.save()
            .font(isMain ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(isMain ? 10.5 : 9.5)
            .fillColor(isMain ? DARK : MEDIUM)
            .text(section.title, MARGIN_LEFT + indent + 40, y, { lineBreak: false })
            .restore();

        // Dotted leader
        const textEndX = MARGIN_LEFT + indent + 40 + doc.widthOfString(section.title, {
            font: isMain ? 'Helvetica-Bold' : 'Helvetica',
            fontSize: isMain ? 10.5 : 9.5
        }) + 8;
        const pageNumX = pageW - MARGIN_RIGHT - 20;
        const dotsY = y + (isMain ? 6 : 5);
        if (pageNumX - textEndX > 20) {
            doc.save()
                .fontSize(8)
                .fillColor('#CCCCCC');
            let dx = textEndX;
            while (dx < pageNumX) {
                doc.text('.', dx, dotsY, { lineBreak: false });
                dx += 4;
            }
            doc.restore();
        }

        doc.save()
            .font('Helvetica')
            .fontSize(9.5)
            .fillColor(MEDIUM)
            .text(String(section.page), pageW - MARGIN_RIGHT - 18, y, {
                width: 18,
                align: 'right',
                lineBreak: false
            })
            .restore();

        y += isMain ? 24 : 20;
    });
};

/** Draw a numbered section heading */
const drawSectionHeading = (doc, number, title, y) => {
    const pageW = doc.page.width;

    doc.save()
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(BRAND)
        .text(`${number}  ${title}`, MARGIN_LEFT, y)
        .restore();

    y += 22;
    line(doc, MARGIN_LEFT, y, pageW - MARGIN_RIGHT, y, BRAND, 1);
    return y + 12;
};

/** Draw a sub-section heading */
const drawSubHeading = (doc, number, title, y) => {
    doc.save()
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(DARK)
        .text(`${number}  ${title}`, MARGIN_LEFT, y)
        .restore();

    return y + 20;
};

/** Draw a paragraph of body text */
const drawBodyText = (doc, text, y, opts = {}) => {
    doc.save()
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(DARK)
        .text(text, MARGIN_LEFT, y, {
            width: CONTENT_WIDTH,
            lineGap: 3,
            ...opts
        })
        .restore();
    return y + doc.heightOfString(text, {
        width: CONTENT_WIDTH,
        fontSize: 9.5,
        lineGap: 3,
        ...opts
    }) + 8;
};

/** Draw a key-value info row */
const drawInfoRow = (doc, label, value, y) => {
    doc.save()
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(DARK)
        .text(label + ':', MARGIN_LEFT + 10, y, { width: 120, lineBreak: false })
        .font('Helvetica')
        .fillColor(MEDIUM)
        .text(String(value), MARGIN_LEFT + 135, y, { width: CONTENT_WIDTH - 145, lineBreak: false })
        .restore();
    return y + 16;
};

/** Draw a summary statistics box */
const drawStatBox = (doc, x, y, w, h, label, value, accent = BRAND) => {
    // Light background
    doc.save()
        .roundedRect(x, y, w, h, 4)
        .fill(BRAND_L)
        .restore();

    // Left accent bar
    rect(doc, x, y, 3, h, accent);

    // Value
    doc.save()
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(DARK)
        .text(String(value), x + 14, y + 8, { width: w - 20 })
        .restore();

    // Label
    doc.save()
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor(MEDIUM)
        .text(label.toUpperCase(), x + 14, y + 32, { width: w - 20 })
        .restore();
};

/** Draw a styled table header row */
const drawTableHeader = (doc, columns, y) => {
    rect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, HEADER_ROW_H, BRAND);
    doc.save().fontSize(8).font('Helvetica-Bold').fillColor(WHITE);
    let x = MARGIN_LEFT + 8;
    columns.forEach(col => {
        if (col.align === 'right') {
            rightText(doc, col.label, x, y + 8, col.width - 8);
        } else {
            doc.text(col.label, x, y + 8, { width: col.width - 8 });
        }
        x += col.width;
    });
    doc.restore();
    return y + HEADER_ROW_H;
};

/** Draw a table data row (alternating bg, with borders) */
const drawTableRow = (doc, columns, values, y, isAlt) => {
    if (isAlt) rect(doc, MARGIN_LEFT, y, CONTENT_WIDTH, ROW_HEIGHT, LIGHT);

    // Bottom border
    line(doc, MARGIN_LEFT, y + ROW_HEIGHT, MARGIN_LEFT + CONTENT_WIDTH, y + ROW_HEIGHT, '#E0E0E0', 0.3);

    doc.save().fontSize(8).font('Helvetica').fillColor(DARK);
    let x = MARGIN_LEFT + 8;
    columns.forEach((col, i) => {
        const val = String(values[i] ?? '—');
        if (col.align === 'right') {
            rightText(doc, val, x, y + 6, col.width - 8);
        } else {
            doc.text(val, x, y + 6, { width: col.width - 8, lineBreak: false });
        }
        x += col.width;
    });
    doc.restore();
    return y + ROW_HEIGHT;
};

/** Draw a bordered table with header and data rows */
const drawTable = (doc, columns, data, y) => {
    // Table top border
    line(doc, MARGIN_LEFT, y, MARGIN_LEFT + CONTENT_WIDTH, y, BRAND, 1);
    y = drawTableHeader(doc, columns, y);

    data.forEach((row, i) => {
        y = ensureSpace(doc, y, ROW_HEIGHT + 5);
        if (y === 50) {
            line(doc, MARGIN_LEFT, y, MARGIN_LEFT + CONTENT_WIDTH, y, BRAND, 1);
            y = drawTableHeader(doc, columns, y);
        }
        y = drawTableRow(doc, columns, row, y, i % 2 === 0);
    });

    // Table bottom border
    line(doc, MARGIN_LEFT, y, MARGIN_LEFT + CONTENT_WIDTH, y, BRAND, 1);
    return y + 6;
};

/** Check if we need a new page */
const ensureSpace = (doc, y, needed = 60) => {
    if (y + needed > doc.page.height - 70) {
        doc.addPage();
        return 50;
    }
    return y;
};


// ══════════════════════════════════════════════════════════════════
// @desc    Generate Student Analytics PDF Report
// @route   GET /api/reports/student-pdf
// @access  Admin / Teacher
// ══════════════════════════════════════════════════════════════════
router.get('/student-pdf', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        // ── Fetch data ──────────────────────────────────────────
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
        const refNumber = genRef('DRR-SA');
        const reportTitle = 'Student Analytics Report';

        // ── Computed analytics ─────────────────────────────────
        const totalSessionsAll = fileStats.reduce((s, f) => s + f.totalSessions, 0);
        const totalDurationAll = fileStats.reduce((s, f) => s + f.totalDuration, 0);
        const avgDurationPerSession = totalSessionsAll > 0 ? totalDurationAll / totalSessionsAll : 0;
        const mostReadFile = fileStats.length > 0 ? fileStats[0].title : '—';
        const mostActiveUser = userStats.length > 0 ? userStats[0].userName : '—';

        // ── Build PDF ───────────────────────────────────────────
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: MARGIN_LEFT, right: MARGIN_RIGHT },
            bufferPages: true,
            info: {
                Title: reportTitle,
                Author: APP_NAME,
                Subject: 'Student reading analytics and engagement metrics',
                Keywords: 'analytics, students, reading, engagement, report',
                Creator: APP_NAME,
                Producer: APP_NAME
            }
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition',
            `attachment; filename="Student-Analytics-Report-${new Date().toISOString().slice(0, 10)}.pdf"`);
        doc.pipe(res);

        // ═══════════════════════════════════════════════════════
        // PAGE 1 — COVER PAGE
        // ═══════════════════════════════════════════════════════
        drawCoverPage(doc, {
            title: reportTitle,
            subtitle: 'Comprehensive analysis of student engagement, reading patterns, and document usage across the Digital Reading Room platform.',
            reportType: 'Analytics Report',
            refNumber,
            preparedBy: 'System Administrator'
        });

        // ═══════════════════════════════════════════════════════
        // TABLE OF CONTENTS
        // ═══════════════════════════════════════════════════════
        const tocSections = [
            { number: '1', title: 'Executive Summary', page: 3 },
            { number: '2', title: 'Platform Overview', page: 3 },
            { number: '2.1', title: 'Key Metrics', page: 3 },
            { number: '3', title: 'Document Performance Analysis', page: 3 },
            { number: '3.1', title: 'File Performance Table', page: 3 },
            { number: '4', title: 'User Activity Analysis', page: 4 },
            { number: '4.1', title: 'User Activity Table', page: 4 },
            { number: '5', title: 'User Notes & Annotations', page: 4 },
            { number: '5.1', title: 'Notes Table', page: 4 },
            { number: '6', title: 'Summary & Recommendations', page: 5 }
        ];
        drawTableOfContents(doc, tocSections);

        // ═══════════════════════════════════════════════════════
        // PAGE 3+ — REPORT BODY
        // ═══════════════════════════════════════════════════════
        doc.addPage();
        let y = 50;

        // ── 1. Executive Summary ────────────────────────────────
        y = drawSectionHeading(doc, '1', 'Executive Summary', y);
        y = drawBodyText(doc,
            `This report provides a comprehensive analysis of student engagement and reading activity within the ${APP_NAME} platform. ` +
            `The data encompasses ${userCount} registered user(s), ${pdfCount} uploaded document(s) across ${courseCount} course(s) and ${subjectCount} subject(s). ` +
            `A total of ${totalSessionsAll} reading session(s) have been recorded, accumulating ${fmtDuration(totalDurationAll)} of total reading time. ` +
            `The average reading duration per session is ${fmtDuration(avgDurationPerSession)}.`, y
        );
        y += 4;

        // ── 2. Platform Overview ────────────────────────────────
        y = ensureSpace(doc, y, 120);
        y = drawSectionHeading(doc, '2', 'Platform Overview', y);

        y = drawSubHeading(doc, '2.1', 'Key Metrics', y);

        // Stat boxes
        const cardW = (CONTENT_WIDTH - 30) / 4;
        drawStatBox(doc, MARGIN_LEFT, y, cardW, 48, 'Total Users', userCount, BRAND);
        drawStatBox(doc, MARGIN_LEFT + cardW + 10, y, cardW, 48, 'Active Courses', courseCount, ACCENT);
        drawStatBox(doc, MARGIN_LEFT + (cardW + 10) * 2, y, cardW, 48, 'Total Subjects', subjectCount, GREEN);
        drawStatBox(doc, MARGIN_LEFT + (cardW + 10) * 3, y, cardW, 48, 'PDF Documents', pdfCount, AMBER);
        y += 60;

        // Additional summary info
        y = drawInfoRow(doc, 'Total Sessions', totalSessionsAll, y);
        y = drawInfoRow(doc, 'Total Read Time', fmtDuration(totalDurationAll), y);
        y = drawInfoRow(doc, 'Avg. Session Duration', fmtDuration(avgDurationPerSession), y);
        y = drawInfoRow(doc, 'Most Read Document', trunc(mostReadFile, 50), y);
        y = drawInfoRow(doc, 'Most Active User', trunc(mostActiveUser, 50), y);
        y = drawInfoRow(doc, 'Total Notes Created', notesData.length, y);
        y += 10;

        // ── 3. Document Performance Analysis ────────────────────
        y = ensureSpace(doc, y, 100);
        y = drawSectionHeading(doc, '3', 'Document Performance Analysis', y);
        y = drawBodyText(doc,
            'The following table details the performance metrics for each document in the system, ' +
            'including the number of reading sessions, unique readers, and total accumulated reading duration.', y
        );

        y = drawSubHeading(doc, '3.1', 'File Performance Table', y);

        if (fileStats.length > 0) {
            const fileCols = [
                { label: 'S.No.', width: 35, align: 'right' },
                { label: 'Document Title', width: 210 },
                { label: 'Sessions', width: 60, align: 'right' },
                { label: 'Unique Users', width: 80, align: 'right' },
                { label: 'Total Duration', width: CONTENT_WIDTH - 385, align: 'right' }
            ];
            const fileData = fileStats.map((s, i) => [
                i + 1,
                trunc(s.title, 42),
                s.totalSessions,
                s.uniqueUsersCount,
                fmtDuration(s.totalDuration)
            ]);
            y = drawTable(doc, fileCols, fileData, y);
        } else {
            y = drawBodyText(doc, 'No document activity has been recorded during the reporting period.', y);
        }

        // ── 4. User Activity Analysis ──────────────────────────
        y += 10;
        y = ensureSpace(doc, y, 100);
        y = drawSectionHeading(doc, '4', 'User Activity Analysis', y);
        y = drawBodyText(doc,
            'This section provides a detailed breakdown of individual user reading activity, ' +
            'showing which documents each user has accessed and the duration of their engagement.', y
        );

        y = drawSubHeading(doc, '4.1', 'User Activity Table', y);

        if (userStats.length > 0) {
            const userCols = [
                { label: 'S.No.', width: 35, align: 'right' },
                { label: 'User Name', width: 110 },
                { label: 'Email', width: 130 },
                { label: 'Document', width: 120 },
                { label: 'Duration', width: CONTENT_WIDTH - 395, align: 'right' }
            ];
            const userData = userStats.map((s, i) => [
                i + 1,
                trunc(s.userName, 20),
                trunc(s.userEmail, 24),
                trunc(s.pdfTitle, 22),
                fmtDuration(s.totalDuration)
            ]);
            y = drawTable(doc, userCols, userData, y);
        } else {
            y = drawBodyText(doc, 'No user activity has been recorded during the reporting period.', y);
        }

        // ── 5. User Notes & Annotations ────────────────────────
        y += 10;
        y = ensureSpace(doc, y, 100);
        y = drawSectionHeading(doc, '5', 'User Notes & Annotations', y);
        y = drawBodyText(doc,
            'The following table lists all notes and annotations made by users while reading documents. ' +
            'These notes indicate active engagement and critical reading behaviour.', y
        );

        y = drawSubHeading(doc, '5.1', 'Notes Table', y);

        if (notesData.length > 0) {
            const noteCols = [
                { label: 'S.No.', width: 30, align: 'right' },
                { label: 'User', width: 100 },
                { label: 'Document', width: 110 },
                { label: 'Page', width: 35, align: 'right' },
                { label: 'Note Content', width: CONTENT_WIDTH - 275 }
            ];
            const noteData = notesData.map((n, i) => [
                i + 1,
                trunc(n.user?.name || 'Unknown', 18),
                trunc(n.pdf?.title || n.pdf?.originalName || 'Unknown', 20),
                String(n.pageNumber || '—'),
                trunc(n.noteContent, 35)
            ]);
            y = drawTable(doc, noteCols, noteData, y);
        } else {
            y = drawBodyText(doc, 'No user notes have been recorded during the reporting period.', y);
        }

        // ── 6. Summary & Recommendations ───────────────────────
        y += 10;
        y = ensureSpace(doc, y, 150);
        y = drawSectionHeading(doc, '6', 'Summary & Recommendations', y);

        y = drawBodyText(doc,
            'Based on the data analysis presented in this report, the following observations and recommendations are made:', y
        );

        const bullets = [];
        if (totalSessionsAll > 0) {
            bullets.push(`A total of ${totalSessionsAll} reading sessions have been recorded across ${pdfCount} documents, indicating ${totalSessionsAll > 50 ? 'active' : 'moderate'} platform utilisation.`);
        } else {
            bullets.push('No reading sessions have been recorded yet. Efforts should be made to encourage platform adoption among students.');
        }

        if (fileStats.length > 0) {
            bullets.push(`"${trunc(mostReadFile, 40)}" is the most accessed document with ${fileStats[0].totalSessions} sessions.`);
        }

        if (notesData.length > 0) {
            bullets.push(`${notesData.length} note(s) have been created, suggesting active engagement with the reading material.`);
        } else {
            bullets.push('No notes have been created. Encouraging students to use the annotation feature may improve engagement.');
        }

        bullets.push('Regular monitoring of reading analytics is recommended to identify trends and areas for improvement.');

        bullets.forEach(bullet => {
            y = ensureSpace(doc, y, 30);
            doc.save()
                .font('Helvetica')
                .fontSize(9)
                .fillColor(DARK)
                .text('•', MARGIN_LEFT + 10, y, { continued: false })
                .text(bullet, MARGIN_LEFT + 24, y, {
                    width: CONTENT_WIDTH - 34,
                    lineGap: 2
                })
                .restore();
            y += doc.heightOfString(bullet, {
                width: CONTENT_WIDTH - 34,
                fontSize: 9,
                lineGap: 2
            }) + 8;
        });

        // End of report marker
        y += 20;
        y = ensureSpace(doc, y, 40);
        line(doc, MARGIN_LEFT, y, MARGIN_LEFT + CONTENT_WIDTH, y, BRAND, 1.5);
        y += 12;
        doc.save()
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(MEDIUM)
            .text('— End of Report —', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' })
            .restore();

        // ── Apply headers & footers on every page ───────────────
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            if (i > 0) {  // Skip cover page
                drawRunningHeader(doc, reportTitle);
            }
            if (i > 0) {  // Skip cover page for footer too (cover has its own)
                drawRunningFooter(doc, i + 1, pages.count, refNumber);
            }
        }

        doc.end();
    } catch (error) {
        console.error('Student PDF report error:', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
});


// ══════════════════════════════════════════════════════════════════
// @desc    Generate Teacher Analytics PDF Report
// @route   GET /api/reports/teacher-pdf
// @access  Admin
// ══════════════════════════════════════════════════════════════════
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
                    courseCode: pdf.courseCode || '—',
                    subjectCode: pdf.subjectCode || '—',
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

        const refNumber = genRef('DRR-TA');
        const reportTitle = 'Teacher Analytics Report';

        // ── Computed analytics ──────────────────────────────────
        const totalTeachers = teacherStats.length;
        const totalUploadsAll = teacherStats.reduce((s, t) => s + t.totalUploads, 0);
        const totalSessionsAll = teacherStats.reduce((s, t) => s + t.totalSessions, 0);
        const totalDurationAll = teacherStats.reduce((s, t) => s + t.totalDuration, 0);
        const topTeacher = teacherStats.length > 0
            ? teacherStats.reduce((prev, curr) => curr.totalSessions > prev.totalSessions ? curr : prev)
            : null;

        // ── Build PDF ───────────────────────────────────────────
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: MARGIN_LEFT, right: MARGIN_RIGHT },
            bufferPages: true,
            info: {
                Title: reportTitle,
                Author: APP_NAME,
                Subject: 'Teacher content analytics and engagement metrics',
                Keywords: 'analytics, teachers, content, engagement, report',
                Creator: APP_NAME,
                Producer: APP_NAME
            }
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition',
            `attachment; filename="Teacher-Analytics-Report-${new Date().toISOString().slice(0, 10)}.pdf"`);
        doc.pipe(res);

        // ═══════════════════════════════════════════════════════
        // PAGE 1 — COVER PAGE
        // ═══════════════════════════════════════════════════════
        drawCoverPage(doc, {
            title: reportTitle,
            subtitle: 'Detailed analysis of teacher contributions, material engagement, and content performance across the Digital Reading Room platform.',
            reportType: 'Analytics Report',
            refNumber,
            preparedBy: 'System Administrator'
        });

        // ═══════════════════════════════════════════════════════
        // TABLE OF CONTENTS
        // ═══════════════════════════════════════════════════════
        const tocSections = [
            { number: '1', title: 'Executive Summary', page: 3 },
            { number: '2', title: 'Teacher Overview', page: 3 },
            { number: '2.1', title: 'Key Metrics', page: 3 },
            { number: '2.2', title: 'Teacher Summary Table', page: 3 },
            { number: '3', title: 'Per-Teacher Material Breakdown', page: 4 },
            { number: '4', title: 'Summary & Recommendations', page: 5 }
        ];

        // Add teacher sub-sections dynamically
        teacherStats.forEach((t, i) => {
            if (t.materials.length > 0) {
                tocSections.splice(tocSections.length - 1, 0, {
                    number: `3.${i + 1}`,
                    title: t.teacherName,
                    page: 4 + Math.floor(i / 2)
                });
            }
        });

        drawTableOfContents(doc, tocSections);

        // ═══════════════════════════════════════════════════════
        // PAGE 3+ — REPORT BODY
        // ═══════════════════════════════════════════════════════
        doc.addPage();
        let y = 50;

        // ── 1. Executive Summary ────────────────────────────────
        y = drawSectionHeading(doc, '1', 'Executive Summary', y);
        y = drawBodyText(doc,
            `This report presents a detailed analysis of teacher contributions and content performance within the ${APP_NAME} platform. ` +
            `There are currently ${totalTeachers} registered teacher(s) who have collectively uploaded ${totalUploadsAll} document(s). ` +
            `These materials have generated ${totalSessionsAll} reading session(s), accumulating ${fmtDuration(totalDurationAll)} of student reading time.` +
            (topTeacher ? ` "${topTeacher.teacherName}" is currently the most engaged teacher based on student reading activity.` : ''), y
        );
        y += 4;

        // ── 2. Teacher Overview ─────────────────────────────────
        y = ensureSpace(doc, y, 120);
        y = drawSectionHeading(doc, '2', 'Teacher Overview', y);

        y = drawSubHeading(doc, '2.1', 'Key Metrics', y);

        // Stat boxes
        const cardW = (CONTENT_WIDTH - 20) / 3;
        drawStatBox(doc, MARGIN_LEFT, y, cardW, 48, 'Total Teachers', totalTeachers, BRAND);
        drawStatBox(doc, MARGIN_LEFT + cardW + 10, y, cardW, 48, 'Total Uploads', totalUploadsAll, ACCENT);
        drawStatBox(doc, MARGIN_LEFT + (cardW + 10) * 2, y, cardW, 48, 'Total Sessions', totalSessionsAll, GREEN);
        y += 60;

        // Additional info
        y = drawInfoRow(doc, 'Total Read Time', fmtDuration(totalDurationAll), y);
        if (topTeacher) {
            y = drawInfoRow(doc, 'Top Teacher', topTeacher.teacherName, y);
            y = drawInfoRow(doc, 'Top Teacher Sessions', topTeacher.totalSessions, y);
        }
        y += 10;

        // ── 2.2 Teacher Summary Table ───────────────────────────
        y = ensureSpace(doc, y, 80);
        y = drawSubHeading(doc, '2.2', 'Teacher Summary Table', y);

        if (teacherStats.length > 0) {
            const summaryCols = [
                { label: 'S.No.', width: 30, align: 'right' },
                { label: 'Teacher Name', width: 100 },
                { label: 'Email', width: 130 },
                { label: 'Uploads', width: 50, align: 'right' },
                { label: 'Sessions', width: 50, align: 'right' },
                { label: 'Readers', width: 50, align: 'right' },
                { label: 'Read Time', width: CONTENT_WIDTH - 410, align: 'right' }
            ];
            const summaryData = teacherStats.map((t, i) => [
                i + 1,
                trunc(t.teacherName, 18),
                trunc(t.teacherEmail, 24),
                t.totalUploads,
                t.totalSessions,
                t.uniqueReaders,
                fmtDuration(t.totalDuration)
            ]);
            y = drawTable(doc, summaryCols, summaryData, y);
        } else {
            y = drawBodyText(doc, 'No teacher data is available for the reporting period.', y);
        }

        // ── 3. Per-Teacher Material Breakdown ───────────────────
        y += 10;
        y = ensureSpace(doc, y, 100);
        y = drawSectionHeading(doc, '3', 'Per-Teacher Material Breakdown', y);
        y = drawBodyText(doc,
            'The following sub-sections provide a detailed breakdown of materials uploaded by each teacher, ' +
            'including individual document performance metrics.', y
        );

        let teacherIdx = 0;
        teacherStats.forEach((teacher) => {
            if (teacher.materials.length === 0) return;
            teacherIdx++;

            y += 6;
            y = ensureSpace(doc, y, 100);
            y = drawSubHeading(doc, `3.${teacherIdx}`, `${teacher.teacherName}  (${teacher.teacherEmail})`, y);

            // Teacher summary line
            y = drawInfoRow(doc, 'Total Uploads', teacher.totalUploads, y);
            y = drawInfoRow(doc, 'Total Sessions', teacher.totalSessions, y);
            y = drawInfoRow(doc, 'Unique Readers', teacher.uniqueReaders, y);
            y += 4;

            const matCols = [
                { label: 'S.No.', width: 30, align: 'right' },
                { label: 'Material Title', width: 130 },
                { label: 'Course', width: 50 },
                { label: 'Subject', width: 50 },
                { label: 'Uploaded', width: 70 },
                { label: 'Sessions', width: 48, align: 'right' },
                { label: 'Readers', width: 45, align: 'right' },
                { label: 'Duration', width: CONTENT_WIDTH - 423, align: 'right' }
            ];

            const matData = teacher.materials.map((m, i) => [
                i + 1,
                trunc(m.title, 24),
                trunc(m.courseCode, 8),
                trunc(m.subjectCode, 8),
                fmtDate(m.uploadDate),
                m.totalSessions,
                m.uniqueReaders,
                fmtDuration(m.totalDuration)
            ]);

            y = drawTable(doc, matCols, matData, y);
            y += 4;
        });

        if (teacherIdx === 0) {
            y = drawBodyText(doc, 'No teachers have uploaded materials during the reporting period.', y);
        }

        // ── 4. Summary & Recommendations ───────────────────────
        y += 10;
        y = ensureSpace(doc, y, 150);
        const summarySection = teacherIdx > 0 ? '4' : '4';
        y = drawSectionHeading(doc, summarySection, 'Summary & Recommendations', y);

        y = drawBodyText(doc,
            'Based on the data analysis presented in this report, the following observations and recommendations are made:', y
        );

        const bullets = [];
        if (totalTeachers > 0) {
            bullets.push(`${totalTeachers} teacher(s) are currently registered on the platform, contributing ${totalUploadsAll} document(s) for student access.`);
        } else {
            bullets.push('No teachers are currently registered. Administrative action is required to onboard faculty members.');
        }

        if (topTeacher) {
            bullets.push(`"${topTeacher.teacherName}" has the highest student engagement with ${topTeacher.totalSessions} reading sessions across their uploaded materials.`);
        }

        if (totalSessionsAll > 0) {
            bullets.push(`Student reading activity totals ${fmtDuration(totalDurationAll)}, indicating ${totalSessionsAll > 100 ? 'strong' : 'developing'} platform engagement.`);
        }

        bullets.push('Regular review of teacher contribution metrics is recommended to ensure equitable content distribution.');
        bullets.push('Teachers with low engagement scores should be encouraged to diversify their material formats and topics.');

        bullets.forEach(bullet => {
            y = ensureSpace(doc, y, 30);
            doc.save()
                .font('Helvetica')
                .fontSize(9)
                .fillColor(DARK)
                .text('•', MARGIN_LEFT + 10, y, { continued: false })
                .text(bullet, MARGIN_LEFT + 24, y, {
                    width: CONTENT_WIDTH - 34,
                    lineGap: 2
                })
                .restore();
            y += doc.heightOfString(bullet, {
                width: CONTENT_WIDTH - 34,
                fontSize: 9,
                lineGap: 2
            }) + 8;
        });

        // End of report marker
        y += 20;
        y = ensureSpace(doc, y, 40);
        line(doc, MARGIN_LEFT, y, MARGIN_LEFT + CONTENT_WIDTH, y, BRAND, 1.5);
        y += 12;
        doc.save()
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(MEDIUM)
            .text('— End of Report —', MARGIN_LEFT, y, { width: CONTENT_WIDTH, align: 'center' })
            .restore();

        // ── Apply headers & footers on every page ───────────────
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            if (i > 0) {
                drawRunningHeader(doc, reportTitle);
            }
            if (i > 0) {
                drawRunningFooter(doc, i + 1, pages.count, refNumber);
            }
        }

        doc.end();
    } catch (error) {
        console.error('Teacher PDF report error:', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
});

module.exports = router;
