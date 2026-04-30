const mongoose = require('mongoose');
const Semester = require('../models/Semester');
const Course = require('../models/Course');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../db');

const cleanup = async () => {
    await connectDB();
    try {
        console.log('Finding orphaned semesters...');
        const semesters = await Semester.find().populate('course');
        const orphaned = semesters.filter(sem => !sem.course);
        
        if (orphaned.length > 0) {
            const ids = orphaned.map(o => o._id);
            const result = await Semester.deleteMany({_id: { $in: ids }});
            console.log(`Deleted ${result.deletedCount} orphaned semesters.`);
        } else {
            console.log('No orphaned semesters found.');
        }

        // Let's also check orphaned subjects
        const Subject = require('../models/Subject');
        const subjects = await Subject.find();
        let orphanedSubjCount = 0;
        for (const sub of subjects) {
            // subjects have courseCode directly, check if course exists
            if (sub.courseCode) {
                const courseExists = await Course.findOne({ code: sub.courseCode });
                if (!courseExists) {
                    await Subject.deleteOne({ _id: sub._id });
                    orphanedSubjCount++;
                }
            }
        }
        console.log(`Deleted ${orphanedSubjCount} orphaned subjects.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

cleanup();
