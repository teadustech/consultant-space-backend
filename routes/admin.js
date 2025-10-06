const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Admin = require('../models/Admin');
const Consultant = require('../models/Consultant');
const Seeker = require('../models/Seeker');
const { authenticateAdmin, requireAdminPermission, ADMIN_PERMISSIONS } = require('../middleware/adminAuth');

// Admin Authentication Routes

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(423).json({ 
        message: 'Account is locked due to too many failed attempts. Try again later.' 
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incLoginAttempts();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        userType: 'admin',
        role: admin.role,
        permissions: admin.permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get admin profile
router.get('/profile', authenticateAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.adminId).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update admin profile
router.put('/profile', authenticateAdmin, async (req, res) => {
  try {
    const { fullName, phone, department, profileImage } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (profileImage) updateData.profileImage = profileImage;

    const admin = await Admin.findByIdAndUpdate(
      req.admin.adminId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      admin
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Dashboard Analytics Routes

// Get dashboard overview
router.get('/dashboard/overview', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.VIEW_DASHBOARD), async (req, res) => {
  try {
    // Get total counts
    const totalConsultants = await Consultant.countDocuments();
    const totalSeekers = await Seeker.countDocuments();
    const verifiedConsultants = await Consultant.countDocuments({ isVerified: true });
    const activeConsultants = await Consultant.countDocuments({ isAvailable: true });

    // Get recent registrations
    const recentConsultants = await Consultant.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email domain createdAt');

    const recentSeekers = await Seeker.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email createdAt');

    // Get domain distribution
    const domainStats = await Consultant.aggregate([
      { $group: { _id: '$domain', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get monthly registrations (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyConsultants = await Consultant.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlySeekers = await Seeker.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      overview: {
        totalConsultants,
        totalSeekers,
        verifiedConsultants,
        activeConsultants,
        totalUsers: totalConsultants + totalSeekers
      },
      recentActivity: {
        consultants: recentConsultants,
        seekers: recentSeekers
      },
      analytics: {
        domainStats,
        monthlyConsultants,
        monthlySeekers
      }
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// User Management Routes

// Get all consultants with pagination and filters
router.get('/consultants', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_CONSULTANTS), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      domain = '', 
      isVerified = '', 
      isAvailable = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } }
      ];
    }
    if (domain) filter.domain = domain;
    if (isVerified !== '') filter.isVerified = isVerified === 'true';
    if (isAvailable !== '') filter.isAvailable = isAvailable === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const consultants = await Consultant.find(filter)
      .select('-password')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Consultant.countDocuments(filter);

    res.json({
      consultants,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNextPage: skip + consultants.length < totalCount,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get consultants error:', error);
    res.status(500).json({ message: 'Failed to fetch consultants' });
  }
});

// Get all seekers with pagination and filters
router.get('/seekers', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_SEEKERS), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      isVerified = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (isVerified !== '') filter.isVerified = isVerified === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const seekers = await Seeker.find(filter)
      .select('-password')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Seeker.countDocuments(filter);

    res.json({
      seekers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNextPage: skip + seekers.length < totalCount,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get seekers error:', error);
    res.status(500).json({ message: 'Failed to fetch seekers' });
  }
});

// Update consultant verification status
router.put('/consultants/:id/verify', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_CONSULTANTS), async (req, res) => {
  try {
    const { isVerified } = req.body;
    
    const consultant = await Consultant.findByIdAndUpdate(
      req.params.id,
      { isVerified: isVerified },
      { new: true, runValidators: true }
    ).select('-password');

    if (!consultant) {
      return res.status(404).json({ message: 'Consultant not found' });
    }

    res.json({
      message: `Consultant ${isVerified ? 'verified' : 'unverified'} successfully`,
      consultant
    });

  } catch (error) {
    console.error('Update consultant verification error:', error);
    res.status(500).json({ message: 'Failed to update verification status' });
  }
});

// Update consultant availability status
router.put('/consultants/:id/availability', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_CONSULTANTS), async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    const consultant = await Consultant.findByIdAndUpdate(
      req.params.id,
      { isAvailable: isAvailable },
      { new: true, runValidators: true }
    ).select('-password');

    if (!consultant) {
      return res.status(404).json({ message: 'Consultant not found' });
    }

    res.json({
      message: `Consultant ${isAvailable ? 'activated' : 'deactivated'} successfully`,
      consultant
    });

  } catch (error) {
    console.error('Update consultant availability error:', error);
    res.status(500).json({ message: 'Failed to update availability status' });
  }
});

// Update consultant commission rate
router.patch('/consultants/:id/commission', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_CONSULTANTS), async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    // Validate commission rate
    if (commissionRate === undefined || commissionRate === null) {
      return res.status(400).json({ message: 'Commission rate is required' });
    }

    if (commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({ message: 'Commission rate must be between 0 and 100' });
    }

    const consultant = await Consultant.findByIdAndUpdate(
      id,
      { commissionRate },
      { new: true, runValidators: true }
    ).select('-password');

    if (!consultant) {
      return res.status(404).json({ message: 'Consultant not found' });
    }

    res.json({
      message: 'Consultant commission rate updated successfully',
      consultant: {
        id: consultant._id,
        fullName: consultant.fullName,
        email: consultant.email,
        commissionRate: consultant.commissionRate
      }
    });

  } catch (error) {
    console.error('Update consultant commission error:', error);
    res.status(500).json({ message: 'Failed to update consultant commission' });
  }
});

// Update seeker verification status
router.put('/seekers/:id/verify', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_SEEKERS), async (req, res) => {
  try {
    const { isVerified } = req.body;
    
    const seeker = await Seeker.findByIdAndUpdate(
      req.params.id,
      { isVerified: isVerified },
      { new: true, runValidators: true }
    ).select('-password');

    if (!seeker) {
      return res.status(404).json({ message: 'Seeker not found' });
    }

    res.json({
      message: `Seeker ${isVerified ? 'verified' : 'unverified'} successfully`,
      seeker
    });

  } catch (error) {
    console.error('Update seeker verification error:', error);
    res.status(500).json({ message: 'Failed to update verification status' });
  }
});

// Delete seeker
router.delete('/seekers/:id', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_SEEKERS), async (req, res) => {
  try {
    const seeker = await Seeker.findByIdAndDelete(req.params.id);

    if (!seeker) {
      return res.status(404).json({ message: 'Seeker not found' });
    }

    res.json({
      message: 'Seeker deleted successfully',
      deletedSeeker: {
        id: seeker._id,
        fullName: seeker.fullName,
        email: seeker.email
      }
    });

  } catch (error) {
    console.error('Delete seeker error:', error);
    res.status(500).json({ message: 'Failed to delete seeker' });
  }
});

// Delete user (consultant or seeker)
router.delete('/users/:userType/:id', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_USERS), async (req, res) => {
  try {
    const { userType, id } = req.params;
    
    let deletedUser;
    
    if (userType === 'consultant') {
      deletedUser = await Consultant.findByIdAndDelete(id);
    } else if (userType === 'seeker') {
      deletedUser = await Seeker.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `${userType} deleted successfully`,
      deletedUser: {
        id: deletedUser._id,
        fullName: deletedUser.fullName,
        email: deletedUser.email
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Admin Management Routes (Super Admin Only)

// Get all admins
router.get('/admins', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Failed to fetch admins' });
  }
});

// Create new admin
router.post('/admins', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
  try {
    const { fullName, email, password, role, permissions } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    // Create new admin
    const admin = new Admin({
      fullName,
      email: email.toLowerCase(),
      password,
      role,
      permissions: permissions || []
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Failed to create admin' });
  }
});

// Update admin
router.put('/admins/:id', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
  try {
    const { fullName, role, permissions, isActive } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      message: 'Admin updated successfully',
      admin
    });

  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ message: 'Failed to update admin' });
  }
});

// Delete admin
router.delete('/admins/:id', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.SYSTEM_ADMIN), async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.admin.adminId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      message: 'Admin deleted successfully',
      deletedAdmin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ message: 'Failed to delete admin' });
  }
});

// System Settings Routes

// Get system settings
router.get('/settings', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    // This would typically fetch from a settings collection
    // For now, return default settings
    const settings = {
      platform: {
        name: 'The Consultant',
        version: '1.0.0',
        maintenance: false
      },
      security: {
        mfaRequired: true,
        sessionTimeout: 24, // hours
        maxLoginAttempts: 5
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false
      },
      features: {
        publicSearch: true,
        chatbot: true,
        analytics: true
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// Update system settings
router.put('/settings', authenticateAdmin, requireAdminPermission(ADMIN_PERMISSIONS.MANAGE_SETTINGS), async (req, res) => {
  try {
    const { platform, security, notifications, features } = req.body;
    
    // This would typically update a settings collection
    // For now, just return success
    res.json({
      message: 'Settings updated successfully',
      settings: { platform, security, notifications, features }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

module.exports = router; 