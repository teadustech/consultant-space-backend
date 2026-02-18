/**
 * One-time script to create the first admin user.
 * Run: node scripts/setup-admin.js
 * Requires in .env: MONGODB_URI (or MONGO_URI), and optionally ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULLNAME.
 * If ADMIN_* are not set, the script will use defaults (change after first login).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@consultantspace.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_FULLNAME = process.env.ADMIN_FULLNAME || 'Super Admin';

async function setupAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existing) {
      console.log('Admin already exists with email:', ADMIN_EMAIL);
      console.log('Use these credentials to log in at /admin/login');
      process.exit(0);
      return;
    }

    const admin = new Admin({
      fullName: ADMIN_FULLNAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: ADMIN_PASSWORD,
      role: 'super_admin',
      permissions: [
        'view_dashboard',
        'manage_users',
        'manage_consultants',
        'manage_seekers',
        'view_analytics',
        'manage_settings',
        'view_logs',
        'manage_payments',
        'manage_content',
        'system_admin'
      ],
      isActive: true
    });

    await admin.save();
    console.log('Admin created successfully.');
    console.log('Email:', ADMIN_EMAIL);
    console.log('Password: (the one you set in ADMIN_PASSWORD or default Admin@123)');
    console.log('Log in at: http://localhost:3000/admin/login (or your frontend URL)');
    console.log('Change the password after first login if you used the default.');
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

setupAdmin();
