const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const auth = require('../middleware/auth.middleware');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Configure Multer for temporary storage
const upload = multer({ dest: 'uploads/' });

// Get all courses
router.get('/', async (req, res) => {
    try {
        const courses = await Course.find().sort({ name: 1 });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new course
router.post('/', auth, async (req, res) => {
    const { name, code, description } = req.body;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const newCourse = new Course({
            name,
            code,
            description
        });
        const savedCourse = await newCourse.save();
        res.status(201).json(savedCourse);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Upload CSV to import courses
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            // Normalize keys to lowercase to be safe or expect specific headers
            // Expect headers: name, code, description
            if (data.name && data.code) {
                results.push(data);
            } else {
                // Try mapping if headers are case-insensitive
                const normalized = {};
                Object.keys(data).forEach(key => {
                    normalized[key.toLowerCase()] = data[key];
                });
                if (normalized.name && normalized.code) {
                    results.push(normalized);
                }
            }
        })
        .on('end', async () => {
            // Delete temp file
            fs.unlinkSync(req.file.path);

            if (results.length === 0) {
                return res.status(400).json({ message: 'No valid course data found in CSV' });
            }

            let addedCount = 0;
            let updatedCount = 0;

            try {
                const bulkOps = results.map(course => ({
                    updateOne: {
                        filter: { code: course.code },
                        update: { $set: course },
                        upsert: true
                    }
                }));

                const result = await Course.bulkWrite(bulkOps);
                res.json({
                    message: 'CSV processing completed',
                    inserted: result.upsertedCount,
                    updated: result.modifiedCount,
                    matched: result.matchedCount
                });
            } catch (error) {
                console.error('Bulk write error:', error);
                res.status(500).json({ message: 'Error processing courses', error: error.message });
            }
        })
        .on('error', (error) => {
            fs.unlinkSync(req.file.path);
            res.status(500).json({ message: 'Error parsing CSV', error: error.message });
        });
});

module.exports = router;
