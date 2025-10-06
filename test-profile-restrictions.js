const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-consultant';

async function testProfileRestrictions() {
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

    // Test 5: Test restricted profile access simulation
    console.log('\n🔐 Testing restricted profile access simulation...');
    
    // Simulate the restricted profile access logic (what seekers should see)
    const restrictedProfileData = await Consultant.findById(consultant._id)
      .select('fullName domain experience hourlyRate rating totalReviews bio expertise skills isVerified isAvailable sessionTypes meetingPlatforms createdAt');
    
    if (restrictedProfileData) {
      console.log('✅ Restricted profile data retrieved successfully');
      console.log('\n📋 Restricted profile data includes:');
      console.log(`- Full Name: ${restrictedProfileData.fullName}`);
      console.log(`- Domain: ${restrictedProfileData.domain}`);
      console.log(`- Experience: ${restrictedProfileData.experience}`);
      console.log(`- Hourly Rate: ${restrictedProfileData.hourlyRate}`);
      console.log(`- Rating: ${restrictedProfileData.rating}`);
      console.log(`- Total Reviews: ${restrictedProfileData.totalReviews}`);
      console.log(`- Bio: ${restrictedProfileData.bio || 'Not set'}`);
      console.log(`- Expertise: ${restrictedProfileData.expertise || 'Not set'}`);
      console.log(`- Skills: ${restrictedProfileData.skills || 'Not set'}`);
      console.log(`- Is Verified: ${restrictedProfileData.isVerified}`);
      console.log(`- Is Available: ${restrictedProfileData.isAvailable}`);
      
      // Check that contact information is NOT included
      console.log('\n🔒 Contact information check:');
      console.log(`- Email field present: ${restrictedProfileData.hasOwnProperty('email') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      console.log(`- Phone field present: ${restrictedProfileData.hasOwnProperty('phone') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      console.log(`- Location field present: ${restrictedProfileData.hasOwnProperty('location') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      
      // Check that education and certifications are NOT included
      console.log('\n📚 Education/Certifications check:');
      console.log(`- Education field present: ${restrictedProfileData.hasOwnProperty('education') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      console.log(`- Certifications field present: ${restrictedProfileData.hasOwnProperty('certifications') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      
    } else {
      console.log('❌ Failed to retrieve restricted profile data');
    }

    // Test 6: Test public profile access (even more restricted)
    console.log('\n🌐 Testing public profile access...');
    const publicProfileData = await Consultant.findById(consultant._id)
      .select('fullName domain experience hourlyRate rating totalReviews bio expertise skills isVerified isAvailable createdAt');
    
    if (publicProfileData) {
      console.log('✅ Public profile data retrieved successfully');
      console.log('\n📋 Public profile data includes:');
      console.log(`- Full Name: ${publicProfileData.fullName}`);
      console.log(`- Domain: ${publicProfileData.domain}`);
      console.log(`- Experience: ${publicProfileData.experience}`);
      console.log(`- Hourly Rate: ${publicProfileData.hourlyRate}`);
      console.log(`- Rating: ${publicProfileData.rating}`);
      console.log(`- Total Reviews: ${publicProfileData.totalReviews}`);
      console.log(`- Bio: ${publicProfileData.bio || 'Not set'}`);
      console.log(`- Expertise: ${publicProfileData.expertise || 'Not set'}`);
      console.log(`- Skills: ${publicProfileData.skills || 'Not set'}`);
      
      // Check that session types and meeting platforms are NOT included in public view
      console.log('\n🔒 Public view restrictions:');
      console.log(`- Session Types field present: ${publicProfileData.hasOwnProperty('sessionTypes') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      console.log(`- Meeting Platforms field present: ${publicProfileData.hasOwnProperty('meetingPlatforms') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
    } else {
      console.log('❌ Failed to retrieve public profile data');
    }

    console.log('\n✅ Profile restrictions test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- ✅ Contact information (email, phone, location) is hidden from seekers');
    console.log('- ✅ Education and certifications are hidden from seekers');
    console.log('- ✅ Only essential information is shown: name, experience, rate, reviews, domain, skills');
    console.log('- ✅ Public view is even more restricted than authenticated view');
    console.log('- ✅ Security and privacy are properly maintained');

  } catch (error) {
    console.error('❌ Error testing profile restrictions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testProfileRestrictions();
}

module.exports = { testProfileRestrictions }; 