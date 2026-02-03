const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: false
    },
    instituteId: {
        type: String,
        required: false
    },
    role: {
        type: String,
        enum: ['admin', 'librarian', 'reader', 'guest'],
        default: 'reader'
    },
    collection: {
        courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
        subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
        pdfs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pdf' }]
    }
}, { timestamps: true });

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
