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

const buildFilenameKey = (value) => String(value || '').trim().toLowerCase();

const pickRowValue = (row, keys = []) => {
    for (const key of keys) {
        const value = row?.[key];
        if (value === undefined || value === null) continue;
        const trimmed = String(value).trim();
        if (trimmed.length > 0) return trimmed;
    }
    return '';
};

const getCourseCodeFromRow = (row) => pickRowValue(row, ['coursecode', 'course_code']);
const getCourseNameFromRow = (row) => pickRowValue(row, ['coursename', 'course_name', 'course']);
const getCourseDescriptionFromRow = (row) => pickRowValue(row, ['coursedescription', 'course_description']);

const getSemesterCodeFromRow = (row) => pickRowValue(row, ['semestercode', 'semester_code']);
const getSemesterNameFromRow = (row) => pickRowValue(row, ['semestername', 'semester_name', 'semester']);
const getSemesterDescriptionFromRow = (row) => pickRowValue(row, ['semesterdescription', 'semester_description']);

const getSubjectCodeFromRow = (row) => pickRowValue(row, ['subjectcode', 'subject_code']);
const getSubjectNameFromRow = (row) => pickRowValue(row, ['subjectname', 'subject_name', 'subject']);
const getSubjectDescriptionFromRow = (row) => pickRowValue(row, ['subjectdescription', 'subject_description']);

const getFilenameFromRow = (row) => pickRowValue(row, ['filename', 'file', 'originalname', 'original_name']);
const getTypeFromRow = (row) => pickRowValue(row, ['type', 'materialtype', 'material_type']);
const getTitleFromRow = (row) => pickRowValue(row, ['title', 'materialtitle', 'material_title']);

const buildSubjectLookup = async (rows = []) => {
    const subjectCodes = Array.from(new Set(
        rows
            .map((row) => getSubjectCodeFromRow(row))
            .filter(Boolean)
    ));

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
        const courseDescription = getCourseDescriptionFromRow(row);

        if (!existing.name && courseName) existing.name = courseName;
        if (!existing.description && courseDescription) existing.description = courseDescription;

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
                    name: entry.name || entry.code,
                    ...(entry.description ? { description: entry.description } : {})
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
        const semesterDescription = getSemesterDescriptionFromRow(row);

        const next = existing || {
            code: semesterCode,
            name: '',
            description: '',
            courseCode,
            courseId
        };

        if (!next.name && semesterName) next.name = semesterName;
        if (!next.description && semesterDescription) next.description = semesterDescription;
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
            if (entry.description) setUpdate.description = entry.description;

            const update = {
                $set: setUpdate,
                $setOnInsert: {
                    code: entry.code,
                    name: entry.name || entry.code,
                    course: entry.courseId,
                    ...(entry.description ? { description: entry.description } : {})
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
        const subjectDescription = getSubjectDescriptionFromRow(row);

        const next = existing || {
            code: subjectCode,
            name: '',
            description: '',
            courseCode,
            semesterCode
        };

        if (!next.name && subjectName) next.name = subjectName;
        if (!next.description && subjectDescription) next.description = subjectDescription;
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
            if (entry.description) setUpdate.description = entry.description;

            const update = {
                $set: setUpdate,
                $setOnInsert: {
                    code: entry.code,
                    name: entry.name || entry.code,
                    courseCode: entry.courseCode,
                    semesterCode: entry.semesterCode,
                    ...(entry.description ? { description: entry.description } : {})
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

    if (subjectCode) {
        const subject = subjectLookup.get(subjectCode);
        if (!subject) {
            issues.push(`subjectCode "${subjectCode}" not found`);
        } else {
            if (explicitCourseCode && explicitCourseCode !== subject.courseCode) {
                issues.push(`subjectCode "${subjectCode}" belongs to courseCode "${subject.courseCode}", not "${explicitCourseCode}"`);
            }

            if (explicitSemesterCode && explicitSemesterCode !== subject.semesterCode) {
                issues.push(`subjectCode "${subjectCode}" belongs to semesterCode "${subject.semesterCode}", not "${explicitSemesterCode}"`);
            }

            resolvedCourseCode = subject.courseCode;
            resolvedSemesterCode = subject.semesterCode;
        }
    }

    if (title) update.title = title;
    if (resolvedCourseCode) update.courseCode = resolvedCourseCode;
    if (subjectCode) update.subjectCode = subjectCode;
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
            subjectCode: subjectCode || ''
        }
    };
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
        res.status(500).json({ message: 'Server Error', error: error.message });
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
        let hierarchySummary = null;
        let subjectLookup = new Map();

        if (uploadedFiles.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one file' });
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

            hierarchySummary = await upsertHierarchyFromRows(mappingRows);
            subjectLookup = await buildSubjectLookup(mappingRows);

            mappingRows.forEach((row, index) => {
                const filename = getFilenameFromRow(row);
                if (!filename) return;
                mappingIndex.set(buildFilenameKey(filename), {
                    row,
                    rowNumber: index + 2
                });
            });
        }

        const results = {
            successful: [],
            failed: []
        };
        const matchedMappingKeys = new Set();

        // Process each file
        for (const file of uploadedFiles) {
            try {
                const filePath = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads', file.filename);
                const mappingEntry = mappingIndex.get(buildFilenameKey(file.originalname));
                const mappingRow = mappingEntry?.row;
                const materialMapping = buildMaterialUpdateFromRow(mappingRow, subjectLookup);
                const mappedUpdate = materialMapping.issues.length > 0 ? {} : materialMapping.update;
                const mappedMetadata = mappedUpdate.metadata || {};

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

                // Infer file type
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
                const fileType = mimeToType[file.mimetype] || 'other'; // Default to 'other' if mimetype not recognized

                // Auto-generate title if not provided
                const title = mappedUpdate.title ||
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
                    type: mappedUpdate.type || fileType,
                    uploadedBy: req.user._id,
                    courseCode: mappedUpdate.courseCode ?? req.body.courseCode,
                    subjectCode: mappedUpdate.subjectCode ?? req.body.subjectCode,
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
                if (autoMapped) {
                    matchedMappingKeys.add(buildFilenameKey(file.originalname));
                }

                results.successful.push({
                    originalName: file.originalname,
                    title: title,
                    pdfId: pdf._id,
                    processed: !!processedData,
                    autoMapped,
                    mappingIssue: materialMapping.issues.length > 0
                        ? `CSV mapping ignored: ${materialMapping.issues.join('; ')}`
                        : '',
                    courseCode: pdf.courseCode || '',
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
                uploadsWithoutCsvMatch: uploadedFiles.length - autoMappedCount,
                unusedCsvRows: Math.max(mappingIndex.size - matchedMappingKeys.size, 0),
                invalidMappings: mappingIssues.length,
                issues: mappingIssues.slice(0, 20)
            } : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
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
// @access  Admin
router.delete('/', protect, authorize('admin'), async (req, res) => {
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
// @access  Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
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

        const updateFields = {};
        if (courseCode !== undefined) updateFields.courseCode = courseCode;
        if (subjectCode !== undefined) updateFields.subjectCode = subjectCode;

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
        if (courseCode !== undefined) pdf.courseCode = courseCode;
        if (subjectCode !== undefined) pdf.subjectCode = subjectCode;
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
            .map((row, index) => ({
                row,
                rowNumber: index + 2,
                filename: getFilenameFromRow(row)
            }))
            .filter((entry) => entry.filename);

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
                    return null;
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
