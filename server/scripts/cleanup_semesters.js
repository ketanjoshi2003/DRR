const mongoose = require('mongoose');
const Semester = require('../models/Semester');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../db');

const cleanup = async () => {
    await connectDB();
    try {
        console.log('Cleaning up extra MCA semesters...');
        const result = await Semester.deleteMany({
            code: { $in: ['MCA-S5', 'MCA-S6'] }
        });
        console.log(`Deleted ${result.deletedCount} semesters.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

cleanup();
