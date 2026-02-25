const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Pdf = require('./models/Pdf');
const Session = require('./models/Session');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const reader = await User.findOne({ role: 'reader' });
    console.log('READER:', reader ? reader.name : 'NONE');

    if (reader) {
        const doc = await Pdf.findOne({ courseCode: 'MCA' });
        console.log('PDF:', doc ? doc.title : 'NONE');

        if (doc) {
            const count = await Session.countDocuments({ userId: reader._id, pdfId: doc._id });
            console.log('VIEW COUNT:', count);
        }
    }
    process.exit();
});
