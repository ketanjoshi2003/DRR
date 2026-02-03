const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Pdf = require('../models/Pdf');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('../db');

const cleanOrphanedFiles = async () => {
    await connectDB();
    try {
        console.log('Fetching all file records from DB...');
        const allPdfs = await Pdf.find({}, 'filename');
        const dbFilenames = new Set(allPdfs.map(p => p.filename));
        console.log(`Found ${dbFilenames.size} files in DB.`);

        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            console.log('Uploads directory does not exist.');
            process.exit(0);
        }

        const files = fs.readdirSync(uploadsDir);
        console.log(`Found ${files.length} files in uploads directory.`);

        let deletedCount = 0;
        for (const file of files) {
            if (!dbFilenames.has(file)) {
                // Skip .gitkeep or similar if exists
                if (file === '.gitkeep') continue;

                console.log(`Deleting orphaned file: ${file}`);
                fs.unlinkSync(path.join(uploadsDir, file));
                deletedCount++;
            }
        }

        console.log(`Cleaned up ${deletedCount} orphaned files.`);
        process.exit(0);
    } catch (err) {
        console.error('Error cleaning orphaned files:', err);
        process.exit(1);
    }
};

cleanOrphanedFiles();
