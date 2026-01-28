const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/digital-room-reader';
        await mongoose.connect(connStr);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
