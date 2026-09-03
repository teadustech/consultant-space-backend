const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware to verify admin JWT token
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Admin access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired admin token' });
    }
    
    // Check if user is admin
    if (user.userType !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const admin = await Admin.findById(user.adminId).select('role permissions isActive');
      if (!admin || !admin.isActive) {
        return res.status(403).json({ message: 'Admin account is inactive or unavailable' });
      }

      req.admin = {
        ...user,
        role: admin.role,
        permissions: admin.getEffectivePermissions()
      };
      next();
    } catch (error) {
      console.error('Admin authorization error:', error);
      return res.status(500).json({ message: 'Unable to authorize admin request' });
    }
  });
};

// Middleware to check admin permissions
const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin.permissions || !req.admin.permissions.includes(permission)) {
      return res.status(403).json({ 
        message: `Admin permission '${permission}' required` 
      });
    }
    next();
  };
};

// Admin permissions constants
const ADMIN_PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_USERS: 'manage_users',
  MANAGE_CONSULTANTS: 'manage_consultants',
  MANAGE_SEEKERS: 'manage_seekers',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_LOGS: 'view_logs',
  MANAGE_PAYMENTS: 'manage_payments',
  MANAGE_CONTENT: 'manage_content',
  SYSTEM_ADMIN: 'system_admin'
};

module.exports = {
  authenticateAdmin,
  requireAdminPermission,
  ADMIN_PERMISSIONS
};
