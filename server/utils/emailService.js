const nodemailer = require('nodemailer');

const createTransporter = () => {
    // In production, these should be set in .env
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || 'digitalreadingroom.alert@gmail.com',
            pass: process.env.SMTP_PASS || 'dummy_password' // Set SMTP_PASS in .env
        }
    });
};

/**
 * Send an email using the default transporter
 * @param {Object} options Email options (to, subject, html, etc.)
 */
const sendEmail = async (options) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: process.env.SMTP_FROM || '"Digital Reading Room" <digitalreadingroom.alert@gmail.com>',
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId} to ${options.to}`);
        return info;
    } catch (error) {
        console.error(`Failed to send email to ${options?.to}:`, error.message);
        // We catch and log, but don't strictly throw so background jobs don't crash
    }
};

module.exports = {
    sendEmail
};
