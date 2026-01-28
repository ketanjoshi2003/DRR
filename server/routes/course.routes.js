const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const auth = require('../middleware/auth.middleware');

// Get all courses
router.get('/', async (req, res) => {
    try {
        const courses = await Course.find().sort({ name: 1 });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new course (Admin only ideally, but keeping simple for now or using auth)
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

module.exports = router;
