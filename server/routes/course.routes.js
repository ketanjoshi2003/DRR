const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Pdf = require('../models/Pdf');
const { protect } = require('../middleware/auth.middleware');
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
router.post('/', protect, async (req, res) => {
    const { name, code, description } = req.body;

    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
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
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
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
                        update: { $set: {
                            name: course.name,
                            code: course.code,
                            description: course.description
                        } },
                        upsert: true
                    }
                }));

                const result = await Course.bulkWrite(bulkOps);

                // Auto-generate semesters if semestercount is provided
                const coursesWithSemesters = results.filter(c => c.semestercount || c.semesterCount);
                if (coursesWithSemesters.length > 0) {
                    const courseCodes = coursesWithSemesters.map(c => c.code);
                    const dbCourses = await Course.find({ code: { $in: courseCodes } });
                    
                    const semesterOps = [];
                    for (const courseData of coursesWithSemesters) {
                        const dbCourse = dbCourses.find(c => c.code === courseData.code);
                        if (!dbCourse) continue;
                        
                        const count = parseInt(courseData.semestercount || courseData.semesterCount, 10);
                        if (!isNaN(count) && count > 0) {
                            for (let i = 1; i <= count; i++) {
                                const semCode = `${dbCourse.code}-SEM${i}`;
                                semesterOps.push({
                                    updateOne: {
                                        filter: { code: semCode },
                                        update: { 
                                            $set: {
                                                name: `Semester ${i}`,
                                                code: semCode,
                                                course: dbCourse._id
                                            }
                                        },
                                        upsert: true
                                    }
                                });
                            }
                        }
                    }
                    if (semesterOps.length > 0) {
                        await Semester.bulkWrite(semesterOps);
                    }
                }

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

// Delete courses (all or specific list) with cascade
router.delete('/', protect, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const { ids } = req.body;
        let coursesToDelete;

        if (ids && Array.isArray(ids) && ids.length > 0) {
            coursesToDelete = await Course.find({ _id: { $in: ids } }).lean();
        } else {
            coursesToDelete = await Course.find({}).lean();
        }

        if (coursesToDelete.length === 0) {
            return res.json({ message: 'No courses found to delete' });
        }

        const courseIds = coursesToDelete.map(c => c._id);
        const courseCodes = coursesToDelete.map(c => c.code);

        // Cascade: delete semesters belonging to these courses
        const semResult = await Semester.deleteMany({ course: { $in: courseIds } });

        // Cascade: delete subjects belonging to these courses
        const subResult = await Subject.deleteMany({ courseCode: { $in: courseCodes } });

        // Unlink PDFs that reference these courses
        await Pdf.updateMany(
            { courseCode: { $in: courseCodes } },
            { $unset: { courseCode: '', subjectCode: '' } }
        );

        // Delete the courses themselves
        const result = await Course.deleteMany({ _id: { $in: courseIds } });

        res.json({
            message: `Deleted ${result.deletedCount} course(s), ${semResult.deletedCount} semester(s), ${subResult.deletedCount} subject(s)`
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
