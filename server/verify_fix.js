
require('dotenv').config();

const testSubject = {
    name: 'Test Subject Auto',
    code: 'TEST-101',
    description: 'Testing virtual mapping',
    courseCode: 'BCA', // Expecting to link to BCA course
    semesterCode: 'BCA-S1' // Expecting to link to BCA-S1 semester
};

const verify = async () => {
    try {
        // 1. Post new subject (Simulating "Create" or "Import")
        // We need an admin token. For this test, we might need to bypass auth or login.
        // Since we don't have login creds easily, let's just inspect the DB directly after inserting via Mongoose in this script.

        const mongoose = require('mongoose');
        const Subject = require('./models/Subject');
        const Course = require('./models/Course');
        const Semester = require('./models/Semester');

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // Cleanup
        await Subject.deleteOne({ code: 'TEST-101' });

        // Insert directly using new schema structure
        await Subject.create(testSubject);
        console.log('Subject created with Codes:', testSubject.courseCode, testSubject.semesterCode);

        // Fetch and Populate
        const subject = await Subject.findOne({ code: 'TEST-101' })
            .populate('course')
            .populate('semester');

        console.log('--- Verification Results ---');
        console.log(`Subject Name: ${subject.name}`);

        if (subject.course && subject.course.name) {
            console.log(`✅  Course Linked: ${subject.course.name} (Code: ${subject.course.code})`);
        } else {
            console.log(`❌  Course Link Failed!`);
        }

        if (subject.semester && subject.semester.name) {
            console.log(`✅  Semester Linked: ${subject.semester.name} (Code: ${subject.semester.code})`);
        } else {
            console.log(`❌  Semester Link Failed!`);
        }

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verify();
