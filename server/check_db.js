const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: './.env' });
const Course = require('./models/Course');
const Semester = require('./models/Semester');
const Subject = require('./models/Subject');

const checkData = async () => {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        await mongoose.connect(process.env.MONGO_URI);
        log('Connected to DB');

        const subjects = await Subject.find().populate('semester').populate('course');
        const semesters = await Semester.find();

        log(`Total Subjects: ${subjects.length}`);
        log(`Total Semesters: ${semesters.length}`);

        let orphanedSubjects = 0;
        let subjectsInSem1 = 0;

        subjects.forEach(sub => {
            if (!sub.semester) {
                orphanedSubjects++;
                // log(`Orphaned Subject: ${sub.name} (Code: ${sub.code})`);
            } else {
                if (sub.semester.name.includes('1') || sub.semester.code.includes('S1')) {
                    subjectsInSem1++;
                }
            }
        });

        log(`Orphaned Subjects (no semester link): ${orphanedSubjects}`);
        log(`Subjects seemingly in Semester 1: ${subjectsInSem1}`);

        // Check ids
        if (semesters.length > 0) {
            log(`First Semester ID: ${semesters[0]._id}`);
        }
        if (subjects.length > 0 && subjects[0].semester) {
            log(`First Subject Semester ID: ${subjects[0].semester._id}`);
        }

        fs.writeFileSync('db_check_result.txt', output);

    } catch (error) {
        log('Error: ' + error);
    } finally {
        await mongoose.disconnect();
    }
};

checkData();
