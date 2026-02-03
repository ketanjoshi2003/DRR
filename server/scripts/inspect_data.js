const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: '../.env' });
const Subject = require('../models/Subject');
const Semester = require('../models/Semester');
const Course = require('../models/Course');

const inspect = async () => {
    let output = '';
    const log = (msg) => output += msg + '\n';
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const subjects = await Subject.find().lean();
        log('--- SUBJECTS (Sample 5) ---');
        subjects.slice(0, 5).forEach(s => {
            log(`Code: ${s.code}, Name: ${s.name}, SemRef: ${s.semester}, CourseRef: ${s.course}`);
        });

        const semesters = await Semester.find().lean();
        log('--- SEMESTERS ---');
        semesters.forEach(s => {
            log(`ID: ${s._id}, Code: ${s.code}, Name: ${s.name}`);
        });

        const courses = await Course.find().lean();
        log('--- COURSES ---');
        courses.forEach(c => {
            log(`ID: ${c._id}, Code: ${c.code}, Name: ${c.name}`);
        });

        fs.writeFileSync('inspect_result.txt', output);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

inspect();
