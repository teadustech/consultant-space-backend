const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-consultant';

async function testProfileUpdate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test 1: Check if consultants exist
    const consultantCount = await Consultant.countDocuments();
    console.log(`\n📊 Total consultants in database: ${consultantCount}`);

    if (consultantCount === 0) {
      console.log('❌ No consultants found. Please run add-test-data.js first.');
      return;
    }

    // Test 2: Get a consultant to test with
    const consultant = await Consultant.findOne({ email: { $regex: /@consultant\.com$/ } });
    if (!consultant) {
      console.log('❌ No test consultant found.');
      return;
    }

    console.log(`\n🔍 Testing with consultant: ${consultant.fullName} (${consultant.email})`);

    // Test 3: Check current profile data
    console.log('\n📋 Current profile data:');
    console.log(`- Full Name: ${consultant.fullName}`);
    console.log(`- Email: ${consultant.email}`);
    console.log(`- Phone: ${consultant.phone}`);
    console.log(`- Domain: ${consultant.domain}`);
    console.log(`- Experience: ${consultant.experience}`);
    console.log(`- Hourly Rate: ${consultant.hourlyRate}`);
    console.log(`- Bio: ${consultant.bio || 'Not set'}`);
    console.log(`- Skills: ${consultant.skills || 'Not set'}`);
    console.log(`- Education: ${consultant.education || 'Not set'}`);
    console.log(`- Certifications: ${consultant.certifications || 'Not set'}`);

    // Test 4: Test profile update
    const updateData = {
      fullName: consultant.fullName + ' (Updated)',
      bio: 'This is an updated bio for testing purposes.',
      skills: 'Updated skills: React, Node.js, MongoDB',
      education: 'Updated education: Master\'s in Computer Science',
      certifications: 'Updated certifications: AWS Certified Developer'
    };

    console.log('\n🔄 Testing profile update...');
    
    const updatedConsultant = await Consultant.findByIdAndUpdate(
      consultant._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (updatedConsultant) {
      console.log('✅ Profile update successful!');
      console.log('\n📋 Updated profile data:');
      console.log(`- Full Name: ${updatedConsultant.fullName}`);
      console.log(`- Bio: ${updatedConsultant.bio}`);
      console.log(`- Skills: ${updatedConsultant.skills}`);
      console.log(`- Education: ${updatedConsultant.education}`);
      console.log(`- Certifications: ${updatedConsultant.certifications}`);
    } else {
      console.log('❌ Profile update failed');
    }

    // Test 5: Test JWT token generation
    console.log('\n🔐 Testing JWT token generation...');
    const token = jwt.sign(
      { userId: consultant._id, userType: 'consultant' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    console.log('✅ JWT token generated successfully');
    console.log(`Token: ${token.substring(0, 50)}...`);

    // Test 6: Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('✅ JWT token verified successfully');
      console.log(`Decoded userId: ${decoded.userId}`);
      console.log(`Decoded userType: ${decoded.userType}`);
    } catch (error) {
      console.log('❌ JWT token verification failed:', error.message);
    }

    console.log('\n✅ Profile update functionality test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing profile update:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testProfileUpdate();
}

module.exports = { testProfileUpdate }; 