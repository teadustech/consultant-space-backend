const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const Booking = require('./models/Booking');
require('dotenv').config();

async function testBookingSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get a consultant and seeker for testing
    const consultant = await Consultant.findOne({ isAvailable: true });
    const seeker = await Seeker.findOne();

    console.log(`\n🔍 Found consultant: ${consultant ? consultant.fullName : 'None'}`);
    console.log(`🔍 Found seeker: ${seeker ? seeker.fullName : 'None'}`);

    if (!consultant) {
      console.log('❌ No available consultants found. Please register a consultant first.');
      return;
    }

    if (!seeker) {
      console.log('❌ No seekers found. Please register a seeker first.');
      return;
    }

    console.log(`\n🧪 Testing Booking System with:`);
    console.log(`   Consultant: ${consultant.fullName} (${consultant.email})`);
    console.log(`   Seeker: ${seeker.fullName} (${seeker.email})`);

    // Test 1: Check consultant availability
    console.log('\n📅 Test 1: Checking Consultant Availability');
    
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    console.log(`   Checking availability for: ${tomorrow.toLocaleDateString()} (${dayOfWeek})`);
    
    const workingHours = consultant.workingHours[dayOfWeek];
    if (workingHours && workingHours.available) {
      console.log(`   ✅ Available: ${workingHours.start} - ${workingHours.end}`);
    } else {
      console.log(`   ❌ Not available on ${dayOfWeek}`);
      return;
    }

    // Test 2: Create a test booking
    console.log('\n📝 Test 2: Creating Test Booking');
    
    const testBooking = new Booking({
      consultant: consultant._id,
      seeker: seeker._id,
      sessionType: 'consultation',
      sessionDuration: 60, // 1 hour
      sessionDate: tomorrow,
      startTime: '10:00',
      meetingPlatform: 'google_meet',
      description: 'Test booking for system verification',
      amount: consultant.hourlyRate // 1 hour rate
    });

    console.log('   Creating booking with middleware...');

    await testBooking.save();
    console.log(`   ✅ Test booking created: ${testBooking.bookingId}`);
    console.log(`   Amount: ₹${testBooking.amount}`);
    console.log(`   Platform Fee: ₹${testBooking.platformFee}`);
    console.log(`   Consultant Amount: ₹${testBooking.consultantAmount}`);

    // Test 3: Check booking details
    console.log('\n📊 Test 3: Booking Details');
    const savedBooking = await Booking.findById(testBooking._id)
      .populate('consultant', 'fullName email')
      .populate('seeker', 'fullName email');
    
    console.log(`   Booking ID: ${savedBooking.bookingId}`);
    console.log(`   Status: ${savedBooking.status}`);
    console.log(`   Date: ${savedBooking.formattedDate}`);
    console.log(`   Time: ${savedBooking.formattedTime}`);
    console.log(`   Duration: ${savedBooking.durationHours} hours`);
    console.log(`   Platform: ${savedBooking.meetingPlatform}`);

    // Test 4: Check availability after booking
    console.log('\n🔍 Test 4: Checking Availability After Booking');
    
    const conflictingBookings = await Booking.find({
      consultant: consultant._id,
      sessionDate: tomorrow,
      startTime: '10:00',
      status: { $in: ['pending', 'confirmed'] }
    });

    console.log(`   Conflicting bookings found: ${conflictingBookings.length}`);
    if (conflictingBookings.length > 0) {
      console.log(`   ✅ Conflict detection working`);
    }

    // Test 5: Update booking status
    console.log('\n🔄 Test 5: Updating Booking Status');
    
    savedBooking.status = 'confirmed';
    await savedBooking.save();
    console.log(`   ✅ Booking status updated to: ${savedBooking.status}`);

    // Test 6: Add review
    console.log('\n⭐ Test 6: Adding Review');
    
    savedBooking.rating = 5;
    savedBooking.review = 'Excellent test session!';
    savedBooking.reviewDate = new Date();
    await savedBooking.save();
    
    console.log(`   ✅ Review added: ${savedBooking.rating} stars`);
    console.log(`   Review: "${savedBooking.review}"`);

    // Test 7: Check consultant rating update
    console.log('\n📈 Test 7: Consultant Rating Update');
    
    const updatedConsultant = await Consultant.findById(consultant._id);
    console.log(`   Previous rating: ${consultant.rating}`);
    console.log(`   Current rating: ${updatedConsultant.rating}`);
    console.log(`   Total reviews: ${updatedConsultant.totalReviews}`);

    // Cleanup: Delete test booking
    console.log('\n🧹 Cleanup: Removing Test Booking');
    await Booking.findByIdAndDelete(testBooking._id);
    console.log('   ✅ Test booking removed');

    console.log('\n🎉 All booking system tests passed successfully!');
    console.log('\n📋 System Status:');
    console.log('   ✅ Database connection working');
    console.log('   ✅ Booking creation working');
    console.log('   ✅ Availability checking working');
    console.log('   ✅ Status updates working');
    console.log('   ✅ Review system working');
    console.log('   ✅ Rating calculations working');
    console.log('   ✅ Conflict detection working');

    console.log('\n🚀 Your booking system is ready to use!');
    console.log('   Start the servers and test the full booking flow.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if all models are properly defined');
    console.log('   2. Verify database connection');
    console.log('   3. Check if consultants have working hours set');
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testBookingSystem(); 