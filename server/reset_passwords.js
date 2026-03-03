const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/digital-room-reader').then(async () => {
    const db = mongoose.connection.db;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);

    await db.collection('users').updateMany({}, { $set: { password: hash } });
    const users = await db.collection('users').find({}).toArray();

    console.log('--- USER ACCOUNTS ---');
    users.forEach(u => {
        console.log(`Email: ${u.email} | Role: ${u.role}`);
    });
    console.log('---------------------');
    console.log('All passwords have been temporarily reset to: password123');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
