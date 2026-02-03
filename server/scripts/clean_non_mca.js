const mongoose = require('mongoose');
const Course = require('../models/Course');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../db');

const cleanExceptMCA = async () => {
    await connectDB();
    try {
        console.log('Cleaning up non-MCA data...');

        // 1. Delete Courses except MCA
        const courseRes = await Course.deleteMany({ code: { $ne: 'MCA' } });
        console.log(`Deleted ${courseRes.deletedCount} non-MCA courses.`);

        // 2. Delete Semesters except those starting with MCA-
        const semRes = await Semester.deleteMany({ code: { $not: /^MCA-/ } });
        console.log(`Deleted ${semRes.deletedCount} non-MCA semesters.`);

        // 3. Delete Subjects except those with courseCode 'MCA'
        const subRes = await Subject.deleteMany({ courseCode: { $ne: 'MCA' } });
        console.log(`Deleted ${subRes.deletedCount} non-MCA subjects.`);

        console.log('Cleanup complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

cleanExceptMCA();
