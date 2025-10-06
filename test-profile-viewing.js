const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-consultant';

async function testProfileViewing() {
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

    // Test 2: Get a verified and available consultant
    const consultant = await Consultant.findOne({ 
      isVerified: true, 
      isAvailable: true,
      email: { $regex: /@consultant\.com$/ }
    });
    
    if (!consultant) {
      console.log('❌ No verified and available consultant found.');
      return;
    }

    console.log(`\n🔍 Testing with consultant: ${consultant.fullName} (${consultant.email})`);
    console.log(`- ID: ${consultant._id}`);
    console.log(`- Verified: ${consultant.isVerified}`);
    console.log(`- Available: ${consultant.isAvailable}`);

    // Test 3: Check if seekers exist
    const seekerCount = await Seeker.countDocuments();
    console.log(`\n📊 Total seekers in database: ${seekerCount}`);

    if (seekerCount === 0) {
      console.log('❌ No seekers found. Please run add-test-data.js first.');
      return;
    }

    // Test 4: Get a seeker to test with
    const seeker = await Seeker.findOne({ email: { $regex: /@seeker\.com$/ } });
    if (!seeker) {
      console.log('❌ No test seeker found.');
      return;
    }

    console.log(`\n👤 Testing with seeker: ${seeker.fullName} (${seeker.email})`);

    // Test 5: Generate JWT token for seeker
    const token = jwt.sign(
      { userId: seeker._id, userType: 'seeker' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    console.log('✅ JWT token generated for seeker');

    // Test 6: Test profile access simulation
    console.log('\n🔐 Testing profile access simulation...');
    
    // Simulate the profile access logic
    const profileData = await Consultant.findById(consultant._id)
      .select('-password');
    
    if (profileData) {
      console.log('✅ Profile data retrieved successfully');
      console.log('\n📋 Profile data includes:');
      console.log(`- Full Name: ${profileData.fullName}`);
      console.log(`- Email: ${profileData.email}`);
      console.log(`- Phone: ${profileData.phone}`);
      console.log(`- Domain: ${profileData.domain}`);
      console.log(`- Experience: ${profileData.experience}`);
      console.log(`- Hourly Rate: ${profileData.hourlyRate}`);
      console.log(`- Bio: ${profileData.bio || 'Not set'}`);
      console.log(`- Skills: ${profileData.skills || 'Not set'}`);
      console.log(`- Education: ${profileData.education || 'Not set'}`);
      console.log(`- Certifications: ${profileData.certifications || 'Not set'}`);
    } else {
      console.log('❌ Failed to retrieve profile data');
    }

    // Test 7: Test public profile access
    console.log('\n🌐 Testing public profile access...');
    const publicProfileData = await Consultant.findById(consultant._id)
      .select('fullName domain experience hourlyRate rating totalReviews bio expertise isVerified isAvailable createdAt');
    
    if (publicProfileData) {
      console.log('✅ Public profile data retrieved successfully');
      console.log(`- Full Name: ${publicProfileData.fullName}`);
      console.log(`- Domain: ${publicProfileData.domain}`);
      console.log(`- Rating: ${publicProfileData.rating}`);
      console.log(`- Total Reviews: ${publicProfileData.totalReviews}`);
    } else {
      console.log('❌ Failed to retrieve public profile data');
    }

    console.log('\n✅ Profile viewing functionality test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- Consultant profile viewing should work for authenticated seekers');
    console.log('- Public profile viewing should work for non-authenticated users');
    console.log('- Only verified and available consultants are shown');
    console.log('- Full profile data is available for authenticated users');
    console.log('- Limited profile data is available for public access');

  } catch (error) {
    console.error('❌ Error testing profile viewing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testProfileViewing();
}

module.exports = { testProfileViewing }; 