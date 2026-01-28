const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    courseCode: {
        type: String,
        required: true
    },
    semesterCode: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for Course
SubjectSchema.virtual('course', {
    ref: 'Course',
    localField: 'courseCode',
    foreignField: 'code',
    justOne: true
});

// Virtual for Semester
SubjectSchema.virtual('semester', {
    ref: 'Semester',
    localField: 'semesterCode',
    foreignField: 'code',
    justOne: true
});

module.exports = mongoose.model('Subject', SubjectSchema);
