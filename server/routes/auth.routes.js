const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth.middleware');

// Generate JWT Utils
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password, role, phone, instituteId, adminSecret } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Real-world security: Force 'reader' role unless a secret key is provided for admin
        let assignedRole = 'reader';
        if (role === 'admin') {
            if (adminSecret === process.env.ADMIN_SECRET) {
                assignedRole = 'admin';
            } else {
                return res.status(403).json({ message: 'Invalid Admin Secret Key. You can only register as a Reader.' });
            }
        }

        const user = await User.create({
            name,
            email,
            password,
            role: assignedRole,
            phone,
            instituteId
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
    res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        instituteId: req.user.instituteId,
    });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone || user.phone;
            user.instituteId = req.body.instituteId || user.instituteId;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                instituteId: updatedUser.instituteId,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort('-createdAt');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with that email address' });
        }

        // Generate reset token
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        // Build reset URL - use FRONTEND_URL env var or fallback
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        // Send email
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: `"Digital Room Reader" <${process.env.SMTP_USER || 'noreply@drr.com'}>`,
            to: user.email,
            subject: 'Password Reset Request - Digital Room Reader',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🔒 Password Reset</h1>
                        <p style="color: rgba(255,255,255,0.85); margin-top: 8px;">Digital Room Reader</p>
                    </div>
                    <div style="padding: 32px;">
                        <p style="color: #374151; font-size: 16px;">Hi <strong>${user.name}</strong>,</p>
                        <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
                            We received a request to reset your password. Click the button below to create a new password. This link will expire in <strong>15 minutes</strong>.
                        </p>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${resetUrl}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                                Reset Password
                            </a>
                        </div>
                        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
                            If you didn't request this, you can safely ignore this email. Your password won't change.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                        <p style="color: #9ca3af; font-size: 12px;">
                            If the button doesn't work, copy and paste this link into your browser:<br/>
                            <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: 'Password reset link has been sent to your email address' });
    } catch (error) {
        // If email fails, clean up the token
        const user = await User.findOne({ email });
        if (user) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });
        }
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
    }
});

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;
    try {
        // Hash the token from URL to compare with stored hash
        const crypto = require('crypto');
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token. Please request a new password reset.' });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Admin
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.remove();
        res.json({ message: 'User removed' });
    } catch (error) {
        // Handle case where user.remove() is deprecated in newer Mongoose versions
        if (error.message.includes('remove is not a function')) {
            await User.findByIdAndDelete(req.params.id);
            return res.json({ message: 'User removed' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
