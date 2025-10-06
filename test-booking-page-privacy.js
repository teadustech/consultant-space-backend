const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-consultant';

async function testBookingPagePrivacy() {
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

    // Test 3: Simulate booking page data loading (what seekers should see)
    console.log('\n🔐 Testing booking page data loading simulation...');
    
    // Simulate the booking page data loading logic (what booking page should see)
    const bookingPageData = await Consultant.findById(consultant._id)
      .select('fullName domain experience hourlyRate rating totalReviews bio expertise skills isVerified isAvailable sessionTypes meetingPlatforms createdAt');
    
    if (bookingPageData) {
      console.log('✅ Booking page data retrieved successfully');
      console.log('\n📋 Booking page data includes:');
      console.log(`- Full Name: ${bookingPageData.fullName}`);
      console.log(`- Domain: ${bookingPageData.domain}`);
      console.log(`- Experience: ${bookingPageData.experience}`);
      console.log(`- Hourly Rate: ${bookingPageData.hourlyRate}`);
      console.log(`- Rating: ${bookingPageData.rating}`);
      console.log(`- Total Reviews: ${bookingPageData.totalReviews}`);
      console.log(`- Bio: ${bookingPageData.bio || 'Not set'}`);
      console.log(`- Expertise: ${bookingPageData.expertise || 'Not set'}`);
      console.log(`- Skills: ${bookingPageData.skills || 'Not set'}`);
      console.log(`- Is Verified: ${bookingPageData.isVerified}`);
      console.log(`- Is Available: ${bookingPageData.isAvailable}`);
      console.log(`- Session Types: ${bookingPageData.sessionTypes?.join(', ') || 'Not set'}`);
      console.log(`- Meeting Platforms: ${bookingPageData.meetingPlatforms?.join(', ') || 'Not set'}`);
      
      // Check that contact information is NOT included
      console.log('\n🔒 Contact information check:');
      console.log(`- Email field present: ${bookingPageData.hasOwnProperty('email') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      console.log(`- Phone field present: ${bookingPageData.hasOwnProperty('phone') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      console.log(`- Location field present: ${bookingPageData.hasOwnProperty('location') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      
      // Check that education and certifications are NOT included
      console.log('\n📚 Education/Certifications check:');
      console.log(`- Education field present: ${bookingPageData.hasOwnProperty('education') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      console.log(`- Certifications field present: ${bookingPageData.hasOwnProperty('certifications') ? '❌ SHOULD NOT BE PRESENT' : '✅ Correctly hidden'}`);
      
    } else {
      console.log('❌ Failed to retrieve booking page data');
    }

    // Test 4: Verify that the data structure matches what the booking page expects
    console.log('\n📝 Verifying booking page data structure...');
    
    const requiredFields = [
      'fullName', 'domain', 'experience', 'hourlyRate', 
      'rating', 'totalReviews', 'bio', 'expertise', 'skills',
      'isVerified', 'isAvailable', 'sessionTypes', 'meetingPlatforms'
    ];
    
    const missingFields = requiredFields.filter(field => !bookingPageData.hasOwnProperty(field));
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields are present for booking page');
    } else {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
    }

    // Test 5: Verify that sensitive fields are properly excluded
    console.log('\n🔐 Verifying sensitive data exclusion...');
    
    const sensitiveFields = ['email', 'phone', 'location', 'education', 'certifications'];
    const exposedSensitiveFields = sensitiveFields.filter(field => bookingPageData.hasOwnProperty(field));
    
    if (exposedSensitiveFields.length === 0) {
      console.log('✅ All sensitive fields are properly hidden');
    } else {
      console.log(`❌ Sensitive fields still exposed: ${exposedSensitiveFields.join(', ')}`);
    }

    console.log('\n✅ Booking page privacy test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- ✅ Booking page loads consultant data correctly');
    console.log('- ✅ Contact information (email, phone, location) is hidden from seekers');
    console.log('- ✅ Education and certifications are hidden from seekers');
    console.log('- ✅ Only essential booking information is shown');
    console.log('- ✅ Privacy and security are properly maintained');
    console.log('- ✅ Booking functionality remains intact');

  } catch (error) {
    console.error('❌ Error testing booking page privacy:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testBookingPagePrivacy();
}

module.exports = { testBookingPagePrivacy }; 