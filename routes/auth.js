const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();
const Consultant = require('../models/Consultant');
const Seeker = require('../models/Seeker');
const { sendPasswordResetEmail, sendPasswordResetConfirmation } = require('../utils/emailService');
const { authenticateToken } = require('../middleware/auth');

// Allow only admin for listing all seekers
const requireAdmin = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Allow seeker to access only own profile, or admin
const requireSeekerOwnProfileOrAdmin = (req, res, next) => {
  const isAdmin = req.user.userType === 'admin';
  const isOwnProfile = req.user.userType === 'seeker' && req.user.userId.toString() === req.params.id;
  if (!isAdmin && !isOwnProfile) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Consultant Registration
router.post('/consultant/register', async (req, res) => {
  try {
    const { fullName, email, phone, domain, experience, rate, password } = req.body;

    // Check if consultant already exists
    const existingConsultant = await Consultant.findOne({ email });
    if (existingConsultant) {
      return res.status(400).json({ message: 'Consultant with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new consultant
    const consultant = new Consultant({
      fullName,
      email,
      phone,
      domain,
      experience: parseInt(experience),
      hourlyRate: parseInt(rate),
      password: hashedPassword
    });

    await consultant.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: consultant._id, userType: 'consultant' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Consultant registered successfully',
      token,
      user: {
        id: consultant._id,
        fullName: consultant.fullName,
        email: consultant.email,
        domain: consultant.domain
      }
    });

  } catch (error) {
    console.error('Consultant registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Seeker Registration
router.post('/seeker/register', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    // Check if seeker already exists
    const existingSeeker = await Seeker.findOne({ email });
    if (existingSeeker) {
      return res.status(400).json({ message: 'Seeker with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new seeker
    const seeker = new Seeker({
      fullName,
      email,
      phone,
      password: hashedPassword
    });

    await seeker.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: seeker._id, userType: 'seeker' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Seeker registered successfully',
      token,
      user: {
        id: seeker._id,
        fullName: seeker.fullName,
        email: seeker.email
      }
    });

  } catch (error) {
    console.error('Seeker registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login (for both consultants and seekers)
router.post('/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!userType || !['consultant', 'seeker'].includes(userType)) {
      return res.status(400).json({ message: 'User type must be consultant or seeker' });
    }

    // Find user based on type
    const Model = userType === 'consultant' ? Consultant : Seeker;
    const user = await Model.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userType },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get all seekers (admin only)
router.get('/seekers/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const seekers = await Seeker.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      count: seekers.length,
      seekers: seekers
    });
  } catch (error) {
    console.error('Get all seekers error:', error);
    res.status(500).json({ error: 'Failed to fetch seekers' });
  }
});

// Get seeker profile (own profile or admin)
router.get('/seekers/:id/profile', authenticateToken, requireSeekerOwnProfileOrAdmin, async (req, res) => {
  try {
    const seeker = await Seeker.findById(req.params.id)
      .select('-password');
    
    if (!seeker) {
      return res.status(404).json({ error: 'Seeker not found' });
    }
    
    res.json(seeker);
  } catch (error) {
    console.error('Seeker profile error:', error);
    res.status(500).json({ error: 'Failed to fetch seeker profile' });
  }
});

// Update seeker profile (own profile or admin)
router.put('/seekers/:id/profile', authenticateToken, requireSeekerOwnProfileOrAdmin, async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    
    const seeker = await Seeker.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!seeker) {
      return res.status(404).json({ error: 'Seeker not found' });
    }
    
    res.json({
      message: 'Profile updated successfully',
      seeker
    });
  } catch (error) {
    console.error('Seeker profile update error:', error);
    res.status(500).json({ error: 'Failed to update seeker profile' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType || !['consultant', 'seeker'].includes(userType)) {
      return res.status(400).json({ message: 'Email and user type are required' });
    }

    // Find user based on type
    const Model = userType === 'consultant' ? Consultant : Seeker;
    const user = await Model.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken, userType, user.fullName);

    if (emailResult.success) {
      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } else {
      // If email fails, clear the reset token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, userType, newPassword } = req.body;

    if (!token || !userType || !newPassword || !['consultant', 'seeker'].includes(userType)) {
      return res.status(400).json({ message: 'Token, user type, and new password are required' });
    }

    // Find user based on type
    const Model = userType === 'consultant' ? Consultant : Seeker;
    const user = await Model.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    await sendPasswordResetConfirmation(user.email, user.fullName);

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'An error occurred while resetting password. Please try again.' });
  }
});

// Verify reset token
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token, userType } = req.body;

    if (!token || !userType || !['consultant', 'seeker'].includes(userType)) {
      return res.status(400).json({ message: 'Token and user type are required' });
    }

    // Find user based on type
    const Model = userType === 'consultant' ? Consultant : Seeker;
    const user = await Model.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Token is valid', userType });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ message: 'An error occurred while verifying token.' });
  }
});

module.exports = router;