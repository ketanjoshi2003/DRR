const mongoose = require('mongoose');
const Course = require('./models/Course');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./db');

const seedCourses = async () => {
    await connectDB();
    try {
        const mcaExists = await Course.findOne({ code: 'MCA' });
        if (!mcaExists) {
            await Course.create({
                name: 'Master of Computer Applications',
                code: 'MCA',
                description: 'Postgraduate course in Computer Applications'
            });
            console.log('MCA Course seeded successfully');
        } else {
            console.log('MCA Course already exists');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error seeding courses:', error);
        process.exit(1);
    }
};

seedCourses();
