const mongoose = require('mongoose');
const path = require('path');
const Pdf = require('../models/Pdf');
const Subject = require('../models/Subject');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const checkPdfRefs = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const pdfs = await Pdf.find({}).lean();
        console.log(`Found ${pdfs.length} PDFs.`);

        for (const pdf of pdfs) {
            console.log(`PDF: ${pdf.title}`);
            console.log(`  Subject ID: ${pdf.subject || 'None'}`);
            if (pdf.subject) {
                const sub = await Subject.findById(pdf.subject);
                console.log(`  Subject Name: ${sub ? sub.name : 'MISSING (Deleted)'}`);
            }
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
checkPdfRefs();
