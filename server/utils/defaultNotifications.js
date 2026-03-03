const cron = require('node-cron');
const User = require('../models/User');
const Session = require('../models/Session');
const Pdf = require('../models/Pdf');
const { sendEmail } = require('./emailService');

// Configs for inactivity periods
const STUDENT_INACTIVITY_DAYS = 7;
const TEACHER_INACTIVITY_DAYS = 14;

/**
 * Checks for inactive students who haven't viewed any materials in the last X days
 * and sends them a notification email.
 */
const checkInactiveStudents = async () => {
    try {
        console.log('[Cron] Checking for inactive students...');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - STUDENT_INACTIVITY_DAYS);

        // Find all student (reader) accounts
        const students = await User.find({ role: 'reader' });

        for (const student of students) {
            // Check if student has had any sessions since cutoff
            const recentSession = await Session.findOne({
                userId: student._id,
                startTime: { $gte: cutoffDate }
            });

            if (!recentSession) {
                // Determine if they've EVER had a session to tailor the message
                const anySession = await Session.findOne({ userId: student._id });

                const subject = anySession
                    ? `We noticed you've been inactive, ${student.name.split(' ')[0]}`
                    : `Get started with Digital Reading Room!`;

                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #2563EB;">Digital Reading Room</h2>
                        <p>Hi ${student.name},</p>
                        <p>We noticed you haven't read any materials on the Digital Reading Room in the past ${STUDENT_INACTIVITY_DAYS} days.</p>
                        <p>Your instructors are constantly uploading new PDFs, course materials, and study guides. Don't miss out on important resources!</p>
                        <p>Log in today to explore new subjects and improve your learning experience.</p>
                        <p style="margin-top: 30px;">Best regards,<br>The Digital Reading Room Team</p>
                    </div>
                `;

                await sendEmail({
                    to: student.email,
                    subject,
                    html
                });
            }
        }
        console.log('[Cron] Finished checking inactive students.');
    } catch (error) {
        console.error('[Cron] Error checking inactive students:', error);
    }
};

/**
 * Checks for inactive teachers who haven't uploaded any materials in the last X days
 * and sends them a notification email.
 */
const checkInactiveTeachers = async () => {
    try {
        console.log('[Cron] Checking for inactive teachers...');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - TEACHER_INACTIVITY_DAYS);

        // Find all teacher accounts
        const teachers = await User.find({ role: 'teacher' });

        for (const teacher of teachers) {
            // Check if teacher has uploaded anything since cutoff
            const recentUpload = await Pdf.findOne({
                uploadedBy: teacher._id,
                createdAt: { $gte: cutoffDate }
            });

            if (!recentUpload) {
                const totalUploads = await Pdf.countDocuments({ uploadedBy: teacher._id });

                const subject = totalUploads > 0
                    ? `Reminder: Keep your students engaged, ${teacher.name.split(' ')[0]}`
                    : `Welcome to Digital Reading Room! Upload your first study material`;

                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #D97706;">Digital Reading Room</h2>
                        <p>Hi ${teacher.name},</p>
                        <p>We want to make sure your students have everything they need to succeed.</p>
                        <p>It's been a while since you shared any new materials (no uploads in the past ${TEACHER_INACTIVITY_DAYS} days). Did you know that regular uploads significantly boost student engagement?</p>
                        <p>Log in to your dashboard to upload new PDFs, assign courses, and track student reading analytics.</p>
                        <p style="margin-top: 30px;">Best regards,<br>The Digital Reading Room Team</p>
                    </div>
                `;

                await sendEmail({
                    to: teacher.email,
                    subject,
                    html
                });
            }
        }
        console.log('[Cron] Finished checking inactive teachers.');
    } catch (error) {
        console.error('[Cron] Error checking inactive teachers:', error);
    }
};

/**
 * Initialize all cron jobs for the default notification system
 */
const initCronJobs = () => {
    // Run student check every Monday at 9:00 AM
    cron.schedule('0 9 * * 1', () => {
        checkInactiveStudents();
    }, {
        timezone: "Asia/Kolkata"
    });

    // Run teacher check every Tuesday at 10:00 AM
    cron.schedule('0 10 * * 2', () => {
        checkInactiveTeachers();
    }, {
        timezone: "Asia/Kolkata"
    });

    console.log('[Cron] Automated notification schedules initialized.');
};

module.exports = {
    initCronJobs
};
