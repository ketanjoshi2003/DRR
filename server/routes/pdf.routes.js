const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const Pdf = require('../models/Pdf');
const Session = require('../models/Session');
const Note = require('../models/Note');
const Course = require('../models/Course');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const { protect, authorize } = require('../middleware/auth.middleware');

const allowedDocumentTypes = [
    'application/pdf',
    'application/epub+zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'video/mp4'
];

const allowedCsvTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/plain'
];

const mimeToType = {
    'application/pdf': 'pdf',
    'application/epub+zip': 'epub',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
    'image/jpeg': 'image',
    'image/png': 'image',
    'audio/mpeg': 'audio',
    'video/mp4': 'video'
};

const buildFilenameKey = (value) => String(value || '').trim().toLowerCase();
const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const pickRowValue = (row, keys = []) => {
    for (const key of keys) {
        const value = row?.[key];
        if (value === undefined || value === null) continue;
        const trimmed = String(value).trim();
        if (trimmed.length > 0) return trimmed;
    }
    return '';
};

const getCourseCodeFromRow = (row) => normalizeCode(pickRowValue(row, ['coursecode', 'course_code']));
const getCourseNameFromRow = (row) => pickRowValue(row, ['coursename', 'course_name', 'course']);
const getCourseDescFromRow = (row) => pickRowValue(row, ['coursedescription', 'course_description', 'coursedesc']);

const getSemesterCodeFromRow = (row) => normalizeCode(pickRowValue(row, ['semestercode', 'semester_code']));
const getSemesterNameFromRow = (row) => pickRowValue(row, ['semestername', 'semester_name', 'semester']);

const getSubjectCodeFromRow = (row) => normalizeCode(pickRowValue(row, ['subjectcode', 'subject_code']));
const getSubjectNameFromRow = (row) => pickRowValue(row, ['subjectname', 'subject_name', 'subject']);

const getFilenameFromRow = (row) => pickRowValue(row, ['filename', 'file', 'originalname', 'original_name']);
const getFilenamesFromRow = (row) => {
    const raw = getFilenameFromRow(row);
    if (!raw) return [];
    return raw.split('|').map(f => f.trim()).filter(Boolean);
};
const getTypeFromRow = (row) => pickRowValue(row, ['type', 'materialtype', 'material_type']);
const getTitleFromRow = (row) => pickRowValue(row, ['title', 'materialtitle', 'material_title']);

const buildSubjectLookup = async (rows = [], extraSubjectCodes = []) => {
    const subjectCodes = Array.from(new Set([
        ...rows.map((row) => getSubjectCodeFromRow(row)),
        ...extraSubjectCodes.map((code) => normalizeCode(code))
    ].filter(Boolean)));

    if (subjectCodes.length === 0) {
        return new Map();
    }

    const subjectDocs = await Subject.find({ code: { $in: subjectCodes } })
        .select('code courseCode semesterCode')
        .lean();

    return new Map(subjectDocs.map((subject) => [subject.code, subject]));
};

const createHierarchySummary = () => ({
    courses: {
        detectedRows: 0,
        processed: 0,
        inserted: 0,
        updated: 0,
        matched: 0,
        skipped: 0
    },
    semesters: {
        detectedRows: 0,
        processed: 0,
        inserted: 0,
        updated: 0,
        matched: 0,
        skipped: 0
    },
    subjects: {
        detectedRows: 0,
        processed: 0,
        inserted: 0,
        updated: 0,
        matched: 0,
        skipped: 0
    },
    issueCount: 0,
    issues: []
});

const pushHierarchyIssue = (summary, issue) => {
    summary.issueCount += 1;
    if (summary.issues.length < 20) {
        summary.issues.push(issue);
    }
};

const applyBulkWriteSummary = (bucket, result) => {
    bucket.inserted = result?.upsertedCount || 0;
    bucket.updated = result?.modifiedCount || 0;
    bucket.matched = result?.matchedCount || 0;
};

const mergeHierarchySummaries = (...summaries) => {
    const merged = createHierarchySummary();

    summaries.filter(Boolean).forEach((summary) => {
        ['courses', 'semesters', 'subjects'].forEach((section) => {
            Object.keys(merged[section]).forEach((key) => {
                merged[section][key] += summary[section]?.[key] || 0;
            });
        });

        merged.issueCount += summary.issueCount || 0;
        (summary.issues || []).forEach((issue) => {
            if (merged.issues.length < 20) {
                merged.issues.push(issue);
            }
        });
    });

    return merged;
};

const hasHierarchyActivity = (summary) => Boolean(summary && (
    summary.courses.processed
    || summary.semesters.processed
    || summary.subjects.processed
    || summary.issueCount
));

const buildInlineHierarchyRows = (body = {}) => {
    if (body.createHierarchy !== 'true') {
        return [];
    }

    const row = {
        coursecode: String(body.courseCode || '').trim(),
        coursename: String(body.courseName || '').trim(),
        coursedescription: String(body.courseDesc || '').trim(),
        semestercode: String(body.semesterCode || '').trim(),
        semestername: String(body.semesterName || '').trim(),
        subjectcode: String(body.subjectCode || '').trim(),
        subjectname: String(body.subjectName || '').trim()
    };

    return Object.values(row).some(Boolean) ? [row] : [];
};

const upsertHierarchyFromRows = async (rows = []) => {
    const summary = createHierarchySummary();
    if (!Array.isArray(rows) || rows.length === 0) {
        return summary;
    }

    // 1) Courses
    const courseRecords = new Map();
    rows.forEach((row) => {
        const courseCode = getCourseCodeFromRow(row);
        if (!courseCode) return;

        summary.courses.detectedRows += 1;

        const existing = courseRecords.get(courseCode) || {
            code: courseCode,
            name: '',
            description: ''
        };

        const courseName = getCourseNameFromRow(row);
        const courseDesc = getCourseDescFromRow(row);

        if (!existing.name && courseName) existing.name = courseName;
        if (!existing.description && courseDesc) existing.description = courseDesc;

        courseRecords.set(courseCode, existing);
    });

    summary.courses.processed = courseRecords.size;
    if (courseRecords.size > 0) {
        const courseOps = Array.from(courseRecords.values()).map((entry) => {
            const setUpdate = {};
            if (entry.name) setUpdate.name = entry.name;
            if (entry.description) setUpdate.description = entry.description;

            const update = {
                $setOnInsert: {
                    code: entry.code,
                    ...(!entry.name ? { name: entry.code } : {})
                }
            };
            if (Object.keys(setUpdate).length > 0) {
                update.$set = setUpdate;
            }

            return {
                updateOne: {
                    filter: { code: entry.code },
                    update,
                    upsert: true
                }
            };
        });

        const courseResult = await Course.bulkWrite(courseOps);
        applyBulkWriteSummary(summary.courses, courseResult);
    }

    const referencedCourseCodes = new Set();
    rows.forEach((row) => {
        const courseCode = getCourseCodeFromRow(row);
        if (courseCode) referencedCourseCodes.add(courseCode);
    });

    const courseIdByCode = new Map();
    if (referencedCourseCodes.size > 0) {
        const courseDocs = await Course.find({ code: { $in: Array.from(referencedCourseCodes) } })
            .select('_id code')
            .lean();

        courseDocs.forEach((course) => {
            courseIdByCode.set(course.code, String(course._id));
        });
    }

    // 2) Semesters
    const semesterRecords = new Map();
    rows.forEach((row, index) => {
        const semesterCode = getSemesterCodeFromRow(row);
        if (!semesterCode) return;

        summary.semesters.detectedRows += 1;

        const courseCode = getCourseCodeFromRow(row);
        if (!courseCode) {
            summary.semesters.skipped += 1;
            pushHierarchyIssue(summary, {
                row: index + 2,
                section: 'semesters',
                code: semesterCode,
                reason: 'Missing courseCode for semester row'
            });
            return;
        }

        const courseId = courseIdByCode.get(courseCode);
        if (!courseId) {
            summary.semesters.skipped += 1;
            pushHierarchyIssue(summary, {
                row: index + 2,
                section: 'semesters',
                code: semesterCode,
                reason: `courseCode "${courseCode}" not found`
            });
            return;
        }

        const existing = semesterRecords.get(semesterCode);
        if (existing && existing.courseCode !== courseCode) {
            summary.semesters.skipped += 1;
            pushHierarchyIssue(summary, {
                row: index + 2,
                section: 'semesters',
                code: semesterCode,
                reason: `Conflicting courseCode values for semesterCode "${semesterCode}"`
            });
            return;
        }

        const semesterName = getSemesterNameFromRow(row);

        const next = existing || {
            code: semesterCode,
            name: '',
            
            courseCode,
            courseId
        };

        if (!next.name && semesterName) next.name = semesterName;
        next.courseCode = courseCode;
        next.courseId = courseId;

        semesterRecords.set(semesterCode, next);
    });

    summary.semesters.processed = semesterRecords.size;
    if (semesterRecords.size > 0) {
        const semesterOps = Array.from(semesterRecords.values()).map((entry) => {
            const setUpdate = {
                course: entry.courseId
            };
            if (entry.name) setUpdate.name = entry.name;

            const update = {
                $set: setUpdate,
                $setOnInsert: {
                    code: entry.code,
                    ...(!entry.name ? { name: entry.code } : {})
                }
            };

            return {
                updateOne: {
                    filter: { code: entry.code },
                    update,
                    upsert: true
                }
            };
        });

        const semesterResult = await Semester.bulkWrite(semesterOps);
        applyBulkWriteSummary(summary.semesters, semesterResult);
    }

    const referencedSemesterCodes = new Set();
    rows.forEach((row) => {
        const semesterCode = getSemesterCodeFromRow(row);
        if (semesterCode) referencedSemesterCodes.add(semesterCode);
    });

    const semesterByCode = new Map();
    if (referencedSemesterCodes.size > 0) {
        const semesterDocs = await Semester.find({ code: { $in: Array.from(referencedSemesterCodes) } })
            .select('code course')
            .lean();

        semesterDocs.forEach((semester) => {
            semesterByCode.set(semester.code, {
                code: semester.code,
                courseId: String(semester.course)
            });
        });
    }

    // 3) Subjects
    const subjectRecords = new Map();
    rows.forEach((row, index) => {
        const subjectCode = getSubjectCodeFromRow(row);
        if (!subjectCode) return;

        summary.subjects.detectedRows += 1;

        const courseCode = getCourseCodeFromRow(row);
        const semesterCode = getSemesterCodeFromRow(row);

        if (!courseCode || !semesterCode) {
            summary.subjects.skipped += 1;
            pushHierarchyIssue(summary, {
                row: index + 2,
                section: 'subjects',
                code: subjectCode,
                reason: 'Missing courseCode or semesterCode for subject row'
            });
            return;
        }

        const courseId = courseIdByCode.get(courseCode);
        if (!courseId) {
            summary.subjects.skipped += 1;
            pushHierarchyIssue(summary, {
                row: index + 2,
                section: 'subjects',
                code: subjectCode,
                reason: `courseCode "${courseCode}" not found`
            });
            return;
        }

        const semester = semesterByCode.get(semesterCode);
        if (!semester) {
            summary.subjects.skipped += 1;
            pushHierarchyIssue(summary, {
                row: index + 2,
                section: 'subjects',
                code: subjectCode,
                reason: `semesterCode "${semesterCode}" not found`
            });
            return;
        }

        if (semester.courseId !== courseId) {
            summary.subjects.skipped += 1;
            pushHierarchyIssue(summary, {
                row: index + 2,
                section: 'subjects',
                code: subjectCode,
                reason: `semesterCode "${semesterCode}" is linked to a different course`
            });
            return;
        }

        const existing = subjectRecords.get(subjectCode);
        if (existing && (existing.courseCode !== courseCode || existing.semesterCode !== semesterCode)) {
            summary.subjects.skipped += 1;
            pushHierarchyIssue(summary, {
                row: index + 2,
                section: 'subjects',
                code: subjectCode,
                reason: `Conflicting courseCode or semesterCode values for subjectCode "${subjectCode}"`
            });
            return;
        }

        const subjectName = getSubjectNameFromRow(row);

        const next = existing || {
            code: subjectCode,
            name: '',
            
            courseCode,
            semesterCode
        };

        if (!next.name && subjectName) next.name = subjectName;
        next.courseCode = courseCode;
        next.semesterCode = semesterCode;

        subjectRecords.set(subjectCode, next);
    });

    summary.subjects.processed = subjectRecords.size;
    if (subjectRecords.size > 0) {
        const subjectOps = Array.from(subjectRecords.values()).map((entry) => {
            const setUpdate = {
                courseCode: entry.courseCode,
                semesterCode: entry.semesterCode
            };
            if (entry.name) setUpdate.name = entry.name;

            const update = {
                $set: setUpdate,
                $setOnInsert: {
                    code: entry.code,
                    ...(!entry.name ? { name: entry.code } : {})
                }
            };

            return {
                updateOne: {
                    filter: { code: entry.code },
                    update,
                    upsert: true
                }
            };
        });

        const subjectResult = await Subject.bulkWrite(subjectOps);
        applyBulkWriteSummary(summary.subjects, subjectResult);
    }

    return summary;
};

const isCsvFile = (file) => {
    return allowedCsvTypes.includes(file.mimetype)
        || path.extname(file.originalname || '').toLowerCase() === '.csv';
};

const normalizeCsvKey = (key) => String(key || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase();

const normalizeCsvRow = (data) => {
    const normalized = {};
    Object.keys(data).forEach((key) => {
        normalized[normalizeCsvKey(key)] = typeof data[key] === 'string'
            ? data[key].trim()
            : data[key];
    });
    return normalized;
};

const deleteIfExists = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

const parseCsvFile = (filePath) => {
    const detectSeparator = () => {
        const preview = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
        const firstLine = preview.split(/\r?\n/, 1)[0] || '';
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;

        return semicolonCount > commaCount ? ';' : ',';
    };

    return new Promise((resolve, reject) => {
        const rows = [];
        const separator = detectSeparator();

        fs.createReadStream(filePath)
            .pipe(csv({
                separator,
                mapHeaders: ({ header }) => normalizeCsvKey(header)
            }))
            .on('data', (data) => {
                rows.push(normalizeCsvRow(data));
            })
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
};

const buildMaterialUpdateFromRow = (row, subjectLookup = new Map()) => {
    if (!row) {
        return {
            update: {},
            issues: [],
            derived: {
                courseCode: '',
                semesterCode: '',
                subjectCode: ''
            }
        };
    }

    const update = {};
    const title = getTitleFromRow(row);
    const explicitCourseCode = getCourseCodeFromRow(row);
    const explicitSemesterCode = getSemesterCodeFromRow(row);
    const subjectCode = getSubjectCodeFromRow(row);
    const type = getTypeFromRow(row);
    const issues = [];

    let resolvedCourseCode = explicitCourseCode;
    let resolvedSemesterCode = explicitSemesterCode;
    let resolvedSubjectCode = '';

    if (subjectCode) {
        const subject = subjectLookup.get(subjectCode);
        if (!subject) {
            issues.push(`subjectCode "${subjectCode}" was not found; subject assignment was skipped`);
        } else {
            if (explicitCourseCode && explicitCourseCode !== subject.courseCode) {
                issues.push(`subjectCode "${subjectCode}" belongs to courseCode "${subject.courseCode}", not "${explicitCourseCode}"; using subject course`);
            }

            if (explicitSemesterCode && explicitSemesterCode !== subject.semesterCode) {
                issues.push(`subjectCode "${subjectCode}" belongs to semesterCode "${subject.semesterCode}", not "${explicitSemesterCode}"; using subject semester`);
            }

            resolvedCourseCode = subject.courseCode;
            resolvedSemesterCode = subject.semesterCode;
            resolvedSubjectCode = subject.code;
        }
    }

    if (title) update.title = title;
    if (resolvedCourseCode) update.courseCode = resolvedCourseCode;
    if (resolvedSubjectCode) update.subjectCode = resolvedSubjectCode;
    if (type) update.type = type;

    const metadata = {};
    const author = pickRowValue(row, ['author']);
    const language = pickRowValue(row, ['language']);
    const yearValue = pickRowValue(row, ['year']);

    if (author) metadata.author = author;
    if (yearValue && !Number.isNaN(Number.parseInt(yearValue, 10))) {
        metadata.year = Number.parseInt(yearValue, 10);
    }
    if (language) metadata.language = language;

    if (Object.keys(metadata).length > 0) {
        update.metadata = metadata;
    }

    return {
        update,
        issues,
        derived: {
            courseCode: resolvedCourseCode || '',
            semesterCode: resolvedSemesterCode || '',
            subjectCode: resolvedSubjectCode || ''
        }
    };
};

const buildFallbackAssignment = (body = {}, subjectLookup = new Map()) => {
    const row = {
        coursecode: String(body.courseCode || '').trim(),
        subjectcode: String(body.subjectCode || '').trim()
    };

    return buildMaterialUpdateFromRow(row, subjectLookup);
};

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, process.env.UPLOAD_PATH || 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (allowedDocumentTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not supported'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const bulkUpload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'mappingFile') {
            if (isCsvFile(file)) {
                cb(null, true);
            } else {
                cb(new Error('Please upload a valid CSV file'), false);
            }
            return;
        }

        if (file.fieldname === 'files') {
            fileFilter(req, file, cb);
            return;
        }

        cb(new Error('Unexpected file field'), false);
    }
});

const csvUpload = multer({
    dest: process.env.UPLOAD_PATH || 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (isCsvFile(file)) {
            cb(null, true);
        } else {
            cb(new Error('Please upload a valid CSV file'), false);
        }
    }
});

// Import PDF processor
const { processUploadedPDF, generateTitle } = require('../utils/pdfProcessor');

// @desc    Upload PDF with metadata extraction and OCR
// @route   POST /api/pdfs/upload
// @access  Admin
router.post('/upload', protect, authorize('admin', 'teacher'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', req.file.filename);

        // Process PDF asynchronously if it is a PDF
        let processedData = null;
        if (req.file.mimetype === 'application/pdf') {
            try {
                processedData = await processUploadedPDF(filePath, {
                    performOCRIfNeeded: true,
                    ocrMaxPages: 5
                });
            } catch (processingError) {
                console.error('PDF processing error:', processingError);
                // Continue with upload even if processing fails
            }
        }

        // Auto-generate title if not provided
        const title = req.body.title ||
            (processedData ? generateTitle(processedData, req.file.originalname) : req.file.originalname);

        const pdf = await Pdf.create({
            title: title,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            uploadedBy: req.user._id,
            type: req.body.type || 'pdf',
            accessControl: req.body.accessControl ? JSON.parse(req.body.accessControl) : undefined,
            // Metadata from PDF
            metadata: {
                ...(processedData?.metadata || {}),
                year: req.body.year,
                language: req.body.language
            },
            extractedText: processedData?.content?.text || '',
            ocrText: processedData?.ocr?.ocrText || '',
            isSearchable: processedData?.isSearchable || false,
            numPages: processedData?.content?.numPages || 0,
            processed: !!processedData,
            processingError: processedData ? null : 'Failed to process PDF'
        });

        res.status(201).json({
            ...pdf.toObject(),
            processingInfo: {
                metadataExtracted: !!processedData?.metadata,
                ocrPerformed: !!processedData?.ocr,
                isSearchable: pdf.isSearchable
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// @desc    Smart Upload - inline hierarchy creation + file upload in one step
// @route   POST /api/pdfs/smart-upload
// @access  Admin/Teacher
router.post('/smart-upload', protect, authorize('admin', 'teacher'), (req, res, next) => {
    bulkUpload.fields([
        { name: 'files', maxCount: 20 }
    ])(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || 'Upload failed' });
        }
        next();
    });
}, async (req, res) => {
    try {
        const uploadedFiles = req.files?.files || [];
        const courseCode = normalizeCode(req.body.courseCode);
        const semesterCode = normalizeCode(req.body.semesterCode);
        const subjectCode = normalizeCode(req.body.subjectCode);
        const {
            courseName,
            semesterName,
            subjectName
        } = req.body;

        const created = { course: null, semester: null, subject: null };

        // 1) Upsert Course if code provided
        if (courseCode) {
            const courseUpdate = { code: courseCode };
            if (courseName) courseUpdate.name = courseName;

            const course = await Course.findOneAndUpdate(
                { code: courseCode },
                {
                    $set: courseUpdate,
                    ...(!courseName ? { $setOnInsert: { name: courseCode } } : {})
                },
                { upsert: true, new: true }
            );
            created.course = { code: course.code, name: course.name, isNew: !course.updatedAt || course.createdAt.getTime() === course.updatedAt.getTime() };

            // 2) Upsert Semester if code provided
            if (semesterCode) {
                const semUpdate = { code: semesterCode, course: course._id };
                if (semesterName) semUpdate.name = semesterName;

                const semester = await Semester.findOneAndUpdate(
                    { code: semesterCode },
                    {
                        $set: semUpdate,
                        ...(!semesterName ? { $setOnInsert: { name: semesterCode } } : {})
                    },
                    { upsert: true, new: true }
                );
                created.semester = { code: semester.code, name: semester.name };

                // 3) Upsert Subject if code provided
                if (subjectCode) {
                    const subUpdate = { code: subjectCode, courseCode, semesterCode };
                    if (subjectName) subUpdate.name = subjectName;

                    const subject = await Subject.findOneAndUpdate(
                        { code: subjectCode },
                        {
                            $set: subUpdate,
                            ...(!subjectName ? { $setOnInsert: { name: subjectCode } } : {})
                        },
                        { upsert: true, new: true }
                    );
                    created.subject = { code: subject.code, name: subject.name };
                }
            }
        }

        // Resolve final assignment codes
        const assignCourseCode = courseCode || '';
        const assignSubjectCode = subjectCode || '';

        const results = { successful: [], failed: [] };

        for (const file of uploadedFiles) {
            try {
                const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', file.filename);

                let processedData = null;
                if (file.mimetype === 'application/pdf') {
                    try {
                        processedData = await processUploadedPDF(filePath, {
                            performOCRIfNeeded: true,
                            ocrMaxPages: 3
                        });
                    } catch (processingError) {
                        console.error(`Processing error for ${file.originalname}:`, processingError);
                    }
                }

                const fileType = mimeToType[file.mimetype] || 'other';

                const title = (processedData ? generateTitle(processedData, file.originalname) : file.originalname);

                const pdf = await Pdf.create({
                    title,
                    filename: file.filename,
                    originalName: file.originalname,
                    size: file.size,
                    type: fileType,
                    uploadedBy: req.user._id,
                    courseCode: assignCourseCode || undefined,
                    subjectCode: assignSubjectCode || undefined,
                    accessControl: { isProtected: false, allowDownload: true, viewOnly: false },
                    metadata: processedData?.metadata || {},
                    extractedText: processedData?.content?.text || '',
                    ocrText: processedData?.ocr?.ocrText || '',
                    isSearchable: processedData?.isSearchable || false,
                    numPages: processedData?.content?.numPages || 0,
                    processed: !!processedData
                });

                results.successful.push({
                    originalName: file.originalname,
                    title,
                    pdfId: pdf._id,
                    processed: !!processedData,
                    courseCode: pdf.courseCode || '',
                    subjectCode: pdf.subjectCode || ''
                });
            } catch (error) {
                console.error(`Failed to process ${file.originalname}:`, error);
                results.failed.push({ originalName: file.originalname, error: error.message });
            }
        }

        res.status(201).json({
            message: `Upload completed: ${results.successful.length} successful, ${results.failed.length} failed`,
            results,
            created
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// @desc    Bulk Upload PDFs with drag-and-drop support
// @route   POST /api/pdfs/bulk-upload
// @access  Admin
router.post('/bulk-upload', protect, authorize('admin', 'teacher'), (req, res, next) => {
    bulkUpload.fields([
        { name: 'files', maxCount: 20 },
        { name: 'mappingFile', maxCount: 1 }
    ])(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || 'Upload failed' });
        }
        next();
    });
}, async (req, res) => {
    try {
        const uploadedFiles = req.files?.files || [];
        const mappingFile = req.files?.mappingFile?.[0];
        const hierarchySummaries = [];
        const inlineRows = buildInlineHierarchyRows(req.body);
        let hierarchySummary = null;
        let subjectLookup = new Map();

        if (uploadedFiles.length === 0 && !mappingFile && inlineRows.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one file or provide a hierarchy mapping' });
        }

        let mappingRows = [];
        const mappingIndex = new Map();
        const mappingIssues = [];

        if (mappingFile) {
            try {
                mappingRows = await parseCsvFile(mappingFile.path);
            } finally {
                deleteIfExists(mappingFile.path);
            }

            if (mappingRows.length === 0) {
                return res.status(400).json({ message: 'Mapping CSV is empty or invalid.' });
            }

            hierarchySummaries.push(await upsertHierarchyFromRows(mappingRows));

            mappingRows.forEach((row, index) => {
                const filenames = getFilenamesFromRow(row);
                if (filenames.length === 0) return;
                filenames.forEach((filename) => {
                    mappingIndex.set(buildFilenameKey(filename), {
                        row,
                        rowNumber: index + 2
                    });
                });
            });
        }

        if (inlineRows.length > 0) {
            hierarchySummaries.push(await upsertHierarchyFromRows(inlineRows));
        }

        const mergedHierarchySummary = mergeHierarchySummaries(...hierarchySummaries);
        hierarchySummary = hasHierarchyActivity(mergedHierarchySummary) ? mergedHierarchySummary : null;

        subjectLookup = await buildSubjectLookup(mappingRows, [
            ...inlineRows.map((row) => getSubjectCodeFromRow(row)),
            req.body.subjectCode
        ]);
        const fallbackAssignment = buildFallbackAssignment(req.body, subjectLookup);

        const results = {
            successful: [],
            failed: []
        };
        const matchedMappingKeys = new Set();
        let matchedFileCount = 0;

        // Process each file
        for (const file of uploadedFiles) {
            try {
                const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', file.filename);
                const mappingEntry = mappingIndex.get(buildFilenameKey(file.originalname));
                const mappingRow = mappingEntry?.row;
                const materialMapping = buildMaterialUpdateFromRow(mappingRow, subjectLookup);
                const mappedUpdate = materialMapping.update;
                const finalUpdate = {
                    ...fallbackAssignment.update,
                    ...mappedUpdate
                };
                const mappedMetadata = finalUpdate.metadata || {};

                if (materialMapping.issues.length > 0) {
                    mappingIssues.push({
                        file: file.originalname,
                        row: mappingEntry?.rowNumber,
                        reasons: materialMapping.issues
                    });
                }

                // Process PDF if it is a PDF
                let processedData = null;
                if (file.mimetype === 'application/pdf') {
                    try {
                        processedData = await processUploadedPDF(filePath, {
                            performOCRIfNeeded: true,
                            ocrMaxPages: 3, // Reduced for bulk processing
                            language: req.body.language
                        });
                    } catch (processingError) {
                        console.error(`Processing error for ${file.originalname}:`, processingError);
                    }
                }

                const fileType = mimeToType[file.mimetype] || 'other'; // Default to 'other' if mimetype not recognized

                // Auto-generate title if not provided
                const title = finalUpdate.title ||
                    req.body.title ||
                    (processedData ? generateTitle(processedData, file.originalname) : file.originalname);

                const batchMetadata = {};
                if (req.body.language) batchMetadata.language = req.body.language;
                if (req.body.year) batchMetadata.year = req.body.year;

                const pdf = await Pdf.create({
                    title: title,
                    filename: file.filename,
                    originalName: file.originalname,
                    size: file.size,
                    type: finalUpdate.type || fileType,
                    uploadedBy: req.user._id,
                    courseCode: finalUpdate.courseCode || undefined,
                    subjectCode: finalUpdate.subjectCode || undefined,
                    accessControl: req.body.accessControl ? JSON.parse(req.body.accessControl) : undefined,
                    metadata: {
                        ...(processedData?.metadata || {}),
                        ...batchMetadata,
                        ...mappedMetadata
                    },
                    extractedText: processedData?.content?.text || '',
                    ocrText: processedData?.ocr?.ocrText || '',
                    isSearchable: processedData?.isSearchable || false,
                    numPages: processedData?.content?.numPages || 0,
                    processed: !!processedData
                });

                const autoMapped = !!mappingRow && Object.keys(mappedUpdate).length > 0;
                if (mappingRow) {
                    matchedFileCount += 1;
                    matchedMappingKeys.add(buildFilenameKey(file.originalname));
                }
                const fallbackApplied = !autoMapped && Object.keys(fallbackAssignment.update).length > 0;

                results.successful.push({
                    originalName: file.originalname,
                    title: title,
                    pdfId: pdf._id,
                    processed: !!processedData,
                    autoMapped,
                    fallbackApplied,
                    mappingIssue: materialMapping.issues.length > 0
                        ? `CSV warning: ${materialMapping.issues.join('; ')}`
                        : '',
                    courseCode: pdf.courseCode || '',
                    semesterCode: materialMapping.derived.semesterCode || fallbackAssignment.derived.semesterCode || '',
                    subjectCode: pdf.subjectCode || ''
                });
            } catch (error) {
                console.error(`Failed to process ${file.originalname}:`, error);
                results.failed.push({
                    originalName: file.originalname,
                    error: error.message
                });
            }
        }

        const autoMappedCount = results.successful.filter((item) => item.autoMapped).length;

        res.status(201).json({
            message: `Bulk upload completed: ${results.successful.length} successful, ${results.failed.length} failed`,
            results,
            hierarchySummary,
            mappingSummary: mappingFile ? {
                uniqueCsvRows: mappingIndex.size,
                autoMappedFiles: autoMappedCount,
                uploadsWithoutCsvMatch: uploadedFiles.length - matchedFileCount,
                unusedCsvRows: Math.max(mappingIndex.size - matchedMappingKeys.size, 0),
                invalidMappings: mappingIssues.length,
                issues: mappingIssues.slice(0, 20)
            } : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// @desc    Get all PDFs
// @route   GET /api/pdfs
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const pdfs = await Pdf.find().populate('uploadedBy', 'name email').sort('-createdAt');
        res.json(pdfs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Get single PDF details
// @route   GET /api/pdfs/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const pdf = await Pdf.findById(req.params.id).populate('uploadedBy', 'name');

        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        res.json(pdf);
    } catch (error) {
        // If ID is invalid (CastError), return 404
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'PDF not found' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Stream PDF
// @route   GET /api/pdfs/:id/stream
// @access  Private
router.get('/:id/stream', protect, async (req, res) => {
    try {
        const pdf = await Pdf.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', pdf.filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Access Control Checks
        if (pdf.accessControl?.isProtected) {
            // Check IP
            if (pdf.accessControl.allowedIps?.length > 0) {
                const clientIp = req.ip || req.connection.remoteAddress;
                if (!pdf.accessControl.allowedIps.includes(clientIp)) {
                    return res.status(403).json({ message: 'Access denied from this IP' });
                }
            }
            // Check Institution
            if (pdf.accessControl.allowedInstitutes?.length > 0) {
                if (!pdf.accessControl.allowedInstitutes.includes(req.user.instituteId)) {
                    return res.status(403).json({ message: 'Access denied for your institution' });
                }
            }
            // Download restriction
            if (req.query.download === 'true' && !pdf.accessControl.allowDownload) {
                return res.status(403).json({ message: 'Download is not allowed for this document' });
            }
            // Concurrent limit check
            if (pdf.accessControl.concurrentLimit > 0) {
                const activeSessionThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 mins
                const activeSessions = await Session.countDocuments({
                    pdfId: pdf._id,
                    updatedAt: { $gt: activeSessionThreshold },
                    endTime: { $exists: false }
                });
                if (activeSessions >= pdf.accessControl.concurrentLimit) {
                    return res.status(429).json({ message: 'Concurrent user limit reached for this document' });
                }
            }
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            const getMimeType = (pdf) => {
                const ext = path.extname(pdf.filename).toLowerCase();
                const mimeMap = {
                    '.pdf': 'application/pdf',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.epub': 'application/epub+zip',
                    '.mp3': 'audio/mpeg',
                    '.mp4': 'video/mp4'
                };
                return mimeMap[ext] || 'application/octet-stream';
            };

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': getMimeType(pdf),
                'Cross-Origin-Resource-Policy': 'cross-origin'
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const getMimeType = (pdf) => {
                const ext = path.extname(pdf.filename).toLowerCase();
                const mimeMap = {
                    '.pdf': 'application/pdf',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.epub': 'application/epub+zip',
                    '.mp3': 'audio/mpeg',
                    '.mp4': 'video/mp4'
                };
                return mimeMap[ext] || 'application/octet-stream';
            };

            const head = {
                'Content-Length': fileSize,
                'Content-Type': getMimeType(pdf),
                'Cross-Origin-Resource-Policy': 'cross-origin'
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Batch Delete PDFs
// @route   DELETE /api/pdfs
// @access  Admin/Teacher
router.delete('/', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { ids } = req.body;

        if (ids && Array.isArray(ids) && ids.length > 0) {
            // Find PDFs to get filenames
            const pdfsToDelete = await Pdf.find({ _id: { $in: ids } });

            // Delete files
            pdfsToDelete.forEach(pdf => {
                const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', pdf.filename);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (err) {
                        console.error(`Failed to delete file: ${filePath}`, err);
                    }
                }
            });

            // Delete DB records
            await Pdf.deleteMany({ _id: { $in: ids } });

            // Clean up related analytics and notes for deleted materials
            await Promise.all([
                Session.deleteMany({ pdfId: { $in: ids } }),
                Note.deleteMany({ pdf: { $in: ids } })
            ]);

            res.json({ message: 'Selected PDFs deleted successfully' });
        } else {
            res.status(400).json({ message: 'No IDs provided for deletion' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Delete PDF
// @route   DELETE /api/pdfs/:id
// @access  Admin/Teacher
router.delete('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const pdf = await Pdf.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        // Delete file from filesystem
        const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', pdf.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await Pdf.deleteOne({ _id: req.params.id });

        // Clean up related analytics and notes for deleted material
        await Promise.all([
            Session.deleteMany({ pdfId: req.params.id }),
            Note.deleteMany({ pdf: req.params.id })
        ]);

        res.json({ message: 'PDF removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Bulk assign course/subject to multiple PDFs
// @route   PUT /api/pdfs/bulk-assign
// @access  Admin
router.put('/bulk-assign', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { ids, courseCode, subjectCode } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No PDF IDs provided' });
        }

        let resolvedCourseCode = courseCode !== undefined ? normalizeCode(courseCode) : courseCode;
        let resolvedSubjectCode = subjectCode !== undefined ? normalizeCode(subjectCode) : subjectCode;

        if (resolvedSubjectCode) {
            const subject = await Subject.findOne({ code: resolvedSubjectCode })
                .select('code courseCode')
                .lean();

            if (!subject) {
                return res.status(400).json({ message: `Subject "${resolvedSubjectCode}" was not found` });
            }

            resolvedSubjectCode = subject.code;
            resolvedCourseCode = subject.courseCode;
        }

        const updateFields = {};
        if (courseCode !== undefined || subjectCode) updateFields.courseCode = resolvedCourseCode;
        if (subjectCode !== undefined) updateFields.subjectCode = resolvedSubjectCode;

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ message: 'No assignment fields provided' });
        }

        const result = await Pdf.updateMany(
            { _id: { $in: ids } },
            { $set: updateFields }
        );

        res.json({
            message: `Successfully assigned ${result.modifiedCount} materials`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Update PDF metadata
// @route   PUT /api/pdfs/:id
// @access  Admin
router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, metadata, type, numPages, courseCode, subjectCode, accessControl } = req.body;
        const pdf = await Pdf.findById(req.params.id);

        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }

        if (title) pdf.title = title;
        if (type) pdf.type = type;
        if (numPages !== undefined) pdf.numPages = numPages;
        const normalizedSubjectCode = subjectCode !== undefined ? normalizeCode(subjectCode) : subjectCode;
        const normalizedCourseCode = courseCode !== undefined ? normalizeCode(courseCode) : courseCode;

        if (normalizedSubjectCode) {
            const subject = await Subject.findOne({ code: normalizedSubjectCode })
                .select('code courseCode')
                .lean();

            if (!subject) {
                return res.status(400).json({ message: `Subject "${normalizedSubjectCode}" was not found` });
            }

            pdf.subjectCode = subject.code;
            pdf.courseCode = subject.courseCode;
        } else {
            if (courseCode !== undefined) pdf.courseCode = normalizedCourseCode;
            if (subjectCode !== undefined) pdf.subjectCode = normalizedSubjectCode;
        }
        if (accessControl) pdf.accessControl = accessControl;
        if (metadata) {
            pdf.metadata = {
                ...pdf.metadata,
                ...metadata
            };
        }

        await pdf.save();
        res.json(pdf);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @desc    Upload CSV to map Materials to Courses/Subjects
// @route   POST /api/pdfs/upload-csv
// @access  Admin
router.post('/upload-csv', protect, authorize('admin', 'teacher'), (req, res, next) => {
    csvUpload.single('file')(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || 'CSV upload failed' });
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const parsedRows = await parseCsvFile(req.file.path);
        deleteIfExists(req.file.path);

        if (parsedRows.length === 0) {
            return res.status(400).json({ message: 'CSV is empty or invalid.' });
        }

        const hierarchySummary = await upsertHierarchyFromRows(parsedRows);
        const subjectLookup = await buildSubjectLookup(parsedRows);
        const mappingIssues = [];

        const results = parsedRows
            .flatMap((row, index) => {
                const filenames = getFilenamesFromRow(row);
                if (filenames.length === 0) return [];
                return filenames.map((filename) => ({
                    row,
                    rowNumber: index + 2,
                    filename
                }));
            });

        if (results.length === 0) {
            return res.json({
                message: 'Master CSV hierarchy processed. No filename rows were found for material mapping.',
                matched: 0,
                modified: 0,
                hierarchySummary
            });
        }

        const bulkOps = results
            .map(({ row, filename, rowNumber }) => {
                const materialMapping = buildMaterialUpdateFromRow(row, subjectLookup);
                const update = materialMapping.update;

                if (materialMapping.issues.length > 0) {
                    mappingIssues.push({
                        row: rowNumber,
                        filename,
                        reasons: materialMapping.issues
                    });
                }

                if (Object.keys(update).length === 0) {
                    return null;
                }

                return {
                    updateMany: {
                        filter: { originalName: filename },
                        update: { $set: update }
                    }
                };
            })
            .filter(Boolean);

        if (bulkOps.length === 0) {
            return res.json({
                message: 'CSV processed. No material metadata fields were provided for filename rows.',
                matched: 0,
                modified: 0,
                skipped: mappingIssues.length,
                issues: mappingIssues.slice(0, 20),
                hierarchySummary
            });
        }

        const result = await Pdf.bulkWrite(bulkOps);
        res.json({
            message: 'Materials CSV processing completed',
            matched: result.matchedCount,
            modified: result.modifiedCount,
            skipped: mappingIssues.length,
            issues: mappingIssues.slice(0, 20),
            hierarchySummary
        });
    } catch (error) {
        deleteIfExists(req.file.path);
        console.error('CSV parsing error:', error);
        res.status(500).json({ message: 'Error parsing CSV', error: error.message });
    }
});

module.exports = router;
