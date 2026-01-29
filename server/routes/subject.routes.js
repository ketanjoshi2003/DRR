const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const Course = require('../models/Course');
const Semester = require('../models/Semester');
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

// Get all subjects
// Get all subjects
router.get('/', async (req, res) => {
    try {
        const subjects = await Subject.find()
            .populate('course', 'name code')
            .populate('semester', 'name code')
            .sort({ name: 1 });
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new subject
router.post('/', protect, async (req, res) => {
    const { name, code, description, courseCode, semesterCode } = req.body;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const newSubject = new Subject({
            name,
            code,
            description,
            courseCode,
            semesterCode
        });
        const savedSubject = await newSubject.save();
        res.status(201).json(savedSubject);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Upload CSV to import subjects
// Expected CSV headers: name, code, description, courseCode, semesterCode
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

            // We need name, code, courseCode, and semesterCode
            if (normalized.name && normalized.code && normalized.coursecode && normalized.semestercode) {
                results.push(normalized);
            }
        })
        .on('end', async () => {
            fs.unlinkSync(req.file.path);

            if (results.length === 0) {
                return res.status(400).json({ message: 'No valid subject data found in CSV. Headers needed: name, code, description, courseCode, semesterCode' });
            }

            try {
                const bulkOps = results.map(row => ({
                    updateOne: {
                        filter: { code: row.code },
                        update: {
                            $set: {
                                name: row.name,
                                code: row.code,
                                description: row.description,
                                courseCode: row.coursecode, // Directly save the code
                                semesterCode: row.semestercode // Directly save the code
                            }
                        },
                        upsert: true
                    }
                }));

                const result = await Subject.bulkWrite(bulkOps);
                res.json({
                    message: 'CSV processing completed',
                    inserted: result.upsertedCount,
                    updated: result.modifiedCount,
                    matched: result.matchedCount,
                    skipped: results.length - bulkOps.length
                });

            } catch (error) {
                console.error('Bulk write error:', error);
                res.status(500).json({ message: 'Error processing subjects', error: error.message });
            }
        })
        .on('error', (error) => {
            fs.unlinkSync(req.file.path);
            res.status(500).json({ message: 'Error parsing CSV', error: error.message });
        });
});

// Delete all subjects
// Delete subjects (all or specific list)
router.delete('/', protect, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const { ids } = req.body;
        let result;
        if (ids && Array.isArray(ids) && ids.length > 0) {
            result = await Subject.deleteMany({ _id: { $in: ids } });
            res.json({ message: `Deleted ${result.deletedCount} subjects` });
        } else {
            result = await Subject.deleteMany({});
            res.json({ message: `Deleted all subjects. Count: ${result.deletedCount}` });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
