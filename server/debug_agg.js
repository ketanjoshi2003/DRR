const mongoose = require('mongoose');
const Session = require('./models/Session');
require('dotenv').config();

const testAggregation = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const pipeline = [
            {
                $group: {
                    _id: { userId: '$userId', pdfId: '$pdfId' },
                    totalSessions: { $sum: 1 },
                    totalDuration: { $sum: '$totalDuration' }, // in seconds
                    lastAccess: { $max: '$startTime' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $lookup: {
                    from: 'pdfs',
                    localField: '_id.pdfId',
                    foreignField: '_id',
                    as: 'pdf'
                }
            },
            // Note: Commenting out unwinds to see intermediate results if empty
            // { $unwind: '$user' },
            // { $unwind: '$pdf' }
        ];

        const stats = await Session.aggregate(pipeline);
        console.log('--- Aggregation Result (Before Unwind) ---');
        console.log(JSON.stringify(stats, null, 2));

        if (stats.length > 0) {
            stats.forEach(s => {
                console.log(`User found: ${s.user.length > 0}`);
                console.log(`PDF found: ${s.pdf.length > 0}`);
            });
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

testAggregation();
