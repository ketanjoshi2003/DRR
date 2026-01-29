const express = require('express');
const router = express.Router();
const Semester = require('../models/Semester');
const Course = require('../models/Course');
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

// Get all semesters
router.get('/', async (req, res) => {
    try {
        const semesters = await Semester.find().populate('course', 'name code').sort({ name: 1 });
        res.json(semesters);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new semester
router.post('/', protect, async (req, res) => {
    const { name, code, description, courseId } = req.body;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const newSemester = new Semester({
            name,
            code,
            description,
            course: courseId
        });
        const savedSemester = await newSemester.save();
        res.status(201).json(savedSemester);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Upload CSV to import semesters
// Expected CSV headers: name, code, description, courseCode
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            // Normalize keys
            const normalized = {};
            Object.keys(data).forEach(key => {
                normalized[key.toLowerCase()] = data[key];
            });

            // We need name, code, and courseCode (to link to course)
            if (normalized.name && normalized.code && normalized.coursecode) {
                results.push(normalized);
            }
        })
        .on('end', async () => {
            fs.unlinkSync(req.file.path);

            if (results.length === 0) {
                return res.status(400).json({ message: 'No valid semester data found in CSV. Headers needed: name, code, description, courseCode' });
            }

            try {
                // Fetch all courses to map courseCode to _id
                const courses = await Course.find({});
                const courseMap = {}; // code -> _id
                courses.forEach(c => {
                    courseMap[c.code] = c._id;
                    courseMap[c.code.toLowerCase()] = c._id; // safe check
                });

                const bulkOps = [];

                for (const row of results) {
                    const courseId = courseMap[row.coursecode] || courseMap[row.coursecode.toLowerCase()];

                    if (courseId) {
                        bulkOps.push({
                            updateOne: {
                                filter: { code: row.code },
                                update: {
                                    $set: {
                                        name: row.name,
                                        code: row.code,
                                        description: row.description,
                                        course: courseId
                                    }
                                },
                                upsert: true
                            }
                        });
                    }
                }

                if (bulkOps.length > 0) {
                    const result = await Semester.bulkWrite(bulkOps);
                    res.json({
                        message: 'CSV processing completed',
                        inserted: result.upsertedCount,
                        updated: result.modifiedCount,
                        matched: result.matchedCount,
                        skipped: results.length - bulkOps.length
                    });
                } else {
                    res.status(400).json({ message: 'No matching courses found for the provided courseCodes.' });
                }

            } catch (error) {
                console.error('Bulk write error:', error);
                res.status(500).json({ message: 'Error processing semesters', error: error.message });
            }
        })
        .on('error', (error) => {
            fs.unlinkSync(req.file.path);
            res.status(500).json({ message: 'Error parsing CSV', error: error.message });
        });
});

// Delete all semesters
// Delete semesters (all or specific list)
router.delete('/', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const { ids } = req.body;
        let result;
        if (ids && Array.isArray(ids) && ids.length > 0) {
            result = await Semester.deleteMany({ _id: { $in: ids } });
            res.json({ message: `Deleted ${result.deletedCount} semesters` });
        } else {
            result = await Semester.deleteMany({});
            res.json({ message: `Deleted all semesters. Count: ${result.deletedCount}` });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
