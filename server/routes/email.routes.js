const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth.middleware');
const { sendEmail } = require('../utils/emailService');

// @desc    Send email to specific groups
// @route   POST /api/emails/send
// @access  Admin, Teacher
router.post('/send', protect, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { targetGroup, subject, text } = req.body;

        if (!targetGroup || !subject || !text) {
            return res.status(400).json({ message: 'Target group, subject, and text are required' });
        }

        let query = {};
        if (targetGroup === 'inactive') {
            const inactiveUserIds = req.body.inactiveUserIds;
            if (!inactiveUserIds || !Array.isArray(inactiveUserIds)) {
                return res.status(400).json({ message: 'Inactive user IDs are required.' });
            }
            query = { _id: { $in: inactiveUserIds } };
        } else if (req.user.role === 'teacher') {
            if (targetGroup !== 'readers' && targetGroup !== 'students') {
                return res.status(403).json({ message: 'Teachers can only email students.' });
            }
            query = { role: 'reader' };
        } else if (req.user.role === 'admin') {
            if (targetGroup === 'teachers') {
                query = { role: 'teacher' };
            } else if (targetGroup === 'students' || targetGroup === 'readers') {
                query = { role: 'reader' };
            } else if (targetGroup === 'all') {
                query = { role: { $in: ['teacher', 'reader'] } };
            } else {
                return res.status(400).json({ message: 'Invalid target group.' });
            }
        }

        const users = await User.find(query).select('email name role');

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found in the selected group.' });
        }

        // We use Promise.allSettled to ensure that even if one email fails, the others proceed
        const emailPromises = users.map(u => {
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #2563EB;">Digital Reading Room</h2>
                    <p>Hi ${u.name},</p>
                    <p>${text.replace(/\n/g, '<br>')}</p>
                    <p style="margin-top: 30px; font-size: 12px; color: #666;">
                        Sent by ${req.user.name} (${req.user.role})
                    </p>
                </div>
            `;
            return sendEmail({
                to: u.email,
                subject: subject,
                html: html
            });
        });

        const results = await Promise.allSettled(emailPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        res.json({ message: `Successfully sent emails to ${successful} users.` + (failed > 0 ? ` Failed to send to ${failed} users.` : '') });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ message: 'Failed to process email request', error: error.message });
    }
});

module.exports = router;
