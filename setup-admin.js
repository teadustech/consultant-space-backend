const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@theconsultant.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email: admin@theconsultant.com');
      console.log('Password: admin123');
      return;
    }

    // Create super admin
    const superAdmin = new Admin({
      fullName: 'Super Administrator',
      email: 'admin@theconsultant.com',
      password: 'admin123',
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
      isActive: true,
      department: 'IT'
    });

    await superAdmin.save();
    console.log('✅ Super Admin created successfully!');
    console.log('📧 Email: admin@theconsultant.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login');

    // Create regular admin
    const admin = new Admin({
      fullName: 'Platform Administrator',
      email: 'platform@theconsultant.com',
      password: 'admin123',
      role: 'admin',
      permissions: [
        'view_dashboard',
        'manage_users',
        'manage_consultants',
        'manage_seekers',
        'view_analytics',
        'manage_settings',
        'view_logs',
        'manage_payments',
        'manage_content'
      ],
      isActive: true,
      department: 'Operations'
    });

    await admin.save();
    console.log('✅ Platform Admin created successfully!');
    console.log('📧 Email: platform@theconsultant.com');
    console.log('🔑 Password: admin123');

    // Create moderator
    const moderator = new Admin({
      fullName: 'Content Moderator',
      email: 'moderator@theconsultant.com',
      password: 'admin123',
      role: 'moderator',
      permissions: [
        'view_dashboard',
        'manage_consultants',
        'manage_seekers',
        'view_analytics',
        'view_logs',
        'manage_content'
      ],
      isActive: true,
      department: 'Content'
    });

    await moderator.save();
    console.log('✅ Content Moderator created successfully!');
    console.log('📧 Email: moderator@theconsultant.com');
    console.log('🔑 Password: admin123');

    console.log('\n🎉 All admin users created successfully!');
    console.log('\n📋 Admin Users Summary:');
    console.log('1. Super Admin (admin@theconsultant.com) - Full access');
    console.log('2. Platform Admin (platform@theconsultant.com) - Limited admin access');
    console.log('3. Content Moderator (moderator@theconsultant.com) - Content management only');

  } catch (error) {
    console.error('❌ Error setting up admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the setup
setupAdmin(); 