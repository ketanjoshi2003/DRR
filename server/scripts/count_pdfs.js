const mongoose = require('mongoose');
const path = require('path');
const Pdf = require('../models/Pdf');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const countPdfs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await Pdf.countDocuments();
        console.log(`Total PDF records in DB: ${count}`);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
countPdfs();
