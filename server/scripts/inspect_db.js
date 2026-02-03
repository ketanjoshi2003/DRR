const mongoose = require('mongoose');
const Session = require('../models/Session');
const User = require('../models/User');
const Pdf = require('../models/Pdf');
require('dotenv').config({ path: '../.env' });

const inspect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const sessions = await Session.find().limit(5);
        console.log('--- RAW SESSIONS (First 5) ---');
        console.log(JSON.stringify(sessions, null, 2));

        const count = await Session.countDocuments();
        console.log(`Total Sessions: ${count}`);

        if (sessions.length > 0) {
            const firstSession = sessions[0];
            console.log('Checking references for first session:');

            const user = await User.findById(firstSession.userId);
            console.log(`User exists: ${!!user} (${firstSession.userId})`);

            const pdf = await Pdf.findById(firstSession.pdfId);
            console.log(`PDF exists: ${!!pdf} (${firstSession.pdfId})`);
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspect();
