const mongoose = require('mongoose');
const Course = require('./models/Course');
const Semester = require('./models/Semester');
const Subject = require('./models/Subject');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./db');

const courses = [
    { name: 'Master of Computer Applications', code: 'MCA', totalSemesters: 4 }
];

const mcaSubjects = [
    // Semester 1
    { code: 'P11A1JP', name: 'JAVA PROGRAMMING- 2024', semesterCode: 'MCA-S1', courseCode: 'MCA', credit: 5 },
    { code: 'P11A2PP', name: 'PYTHON PROGRAMMING- 2024', semesterCode: 'MCA-S1', courseCode: 'MCA', credit: 5 },
    { code: 'P11A3DMS', name: 'DATABASE MANAGEMENT SYSTEM- 2024', semesterCode: 'MCA-S1', courseCode: 'MCA', credit: 5 },
    { code: 'P11A4FM', name: 'FOUNDATIONS OF MATHEMATICS- 2024', semesterCode: 'MCA-S1', courseCode: 'MCA', credit: 3 },
    { code: 'P11A5LFN', name: 'LINUX FUNDAMENTAL WITH NETWORKING - 2024', semesterCode: 'MCA-S1', courseCode: 'MCA', credit: 4 },
    { code: 'P11A6ADP', name: 'ALGORITHMS AND LOGIC DEVELOPMENT', semesterCode: 'MCA-S1', courseCode: 'MCA', credit: 0 },
    { code: 'P11A7WDD', name: 'WEB DESIGNING AND DATABASE', semesterCode: 'MCA-S1', courseCode: 'MCA', credit: 0 },
    { code: 'P11A8CFN', name: 'COMPUTER FUNDAMENTALS AND NETWORKING', semesterCode: 'MCA-S1', courseCode: 'MCA', credit: 0 },
    { code: 'TEACHING SCHEME JUNE 2022', name: 'MCA TEACHING SCHEME JUNE 2022', semesterCode: 'MCA-S1', courseCode: 'MCA', credit: 0 },

    // Semester 2
    { code: 'P12A1FMA', name: 'FUNDAMENTAL OF MOBILE APPLICATION - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 5 },
    { code: 'P12A2WTD', name: 'WEB TECHNOLOGY USING .NET - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 5 },
    { code: 'P12A3SE', name: 'SOFTWARE ENGINEERING - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 3 },
    { code: 'P12A4IOT', name: 'BASICS OF IOT AND AUTOMATION - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A4FST', name: 'FUNDAMENTAL OF SOFTWARE TESTING - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A4CS1', name: 'CYBER SECURITY-I - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A4DS1', name: 'DATA SCIENCE-I - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A4BD1', name: 'BIG DATA ANALYTICS-I - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A4CC1', name: 'CLOUD COMPUTING-I - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A4ML1', name: 'MACHINE LEARNING-I - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A5STA', name: 'SOFTWARE TESTING AUTOMATION - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A5AGL', name: 'AGILE METHODOLOGY - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A5AIR', name: 'ARTIFICIAL INTELLIGENCE AND ROBOTICS - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },
    { code: 'P12A5BC1', name: 'BLOCKCHAIN TECHNOLOGY-I - 2024', semesterCode: 'MCA-S2', courseCode: 'MCA', credit: 4 },

    // Semester 3
    { code: 'P13A1ADM', name: 'ADVANCED DATABASE MANAGEMENT SYSTEM - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A2WTD', name: 'WEB TECHNOLOGIES DEVELOPMENT USING PHP - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A3DOP', name: 'DEVOPS - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A4TAR', name: 'TESTING AND AUTOMATION REST API - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A4WTD', name: 'WEB TECHNOLOGIES DEVELOPMENT USING SPRING - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A4IOS', name: 'IOS APPLICATION DEVELOPMENT - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A4DAA', name: 'DESIGN AND ANALYSIS OF ALGORITHMS - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A4ENT', name: 'ENTREPRENEURSHIP - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 2 },
    { code: 'P13A4HVE', name: 'HUMAN VALUES AND PROFESSIONAL ETHICS - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 2 },
    { code: 'P13A5MTA', name: 'MOBILE TESTING & AUTOMATION - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A5ITA', name: 'IOT ADVANCED - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A5ISA', name: 'FUNDAMENTAL OF INFORMATION SYSTEMS AUDIT - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 2 },
    { code: 'P13A5DS2', name: 'DATA SCIENCE-II - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A5BD2', name: 'BIG DATA ANALYTICS-II - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A5CC2', name: 'CLOUD COMPUTING-II - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A5ML2', name: 'MACHINE LEARNING-II - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 2 },
    { code: 'P13A5BC2', name: 'BLOCKCHAIN TECHNOLOGY-II - 2024', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 4 },
    { code: 'P13A6SDP1', name: 'SYSTEM DEVELOPMENT PROJECT – I', semesterCode: 'MCA-S3', courseCode: 'MCA', credit: 5 },

    // Semester 4
    { code: 'P14A1SDP2', name: 'SYSTEM DEVELOPMENT PROJECT – II - 2024', semesterCode: 'MCA-S4', courseCode: 'MCA', credit: 24 }
];

const seed = async () => {
    await connectDB();
    try {
        console.log('Seeding Courses...');
        for (const c of courses) {
            await Course.updateOne(
                { code: c.code },
                { $set: c },
                { upsert: true }
            );
        }

        console.log('Seeding Semesters...');
        const allCourses = await Course.find();

        // Map totalSemesters from our config to the fetched courses
        const courseConfig = {};
        courses.forEach(c => courseConfig[c.code] = c.totalSemesters || 6);

        for (const course of allCourses) {
            const limit = courseConfig[course.code] || 6;
            for (let i = 1; i <= limit; i++) {
                const semCode = `${course.code}-S${i}`;
                await Semester.updateOne(
                    { code: semCode },
                    {
                        $set: {
                            name: `Semester ${i}`,
                            code: semCode,
                            course: course._id
                        }
                    },
                    { upsert: true }
                );
            }
        }

        console.log('Seeding Subjects...');
        for (const sub of mcaSubjects) {
            await Subject.updateOne(
                { code: sub.code },
                {
                    $set: {
                        name: sub.name,
                        code: sub.code,
                        courseCode: sub.courseCode,
                        semesterCode: sub.semesterCode,
                        description: `Credit: ${sub.credit}`
                    }
                },
                { upsert: true }
            );
        }

        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
