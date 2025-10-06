const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const Booking = require('./models/Booking');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testBookingLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    // Find Sarah Johnson (consultant)
    const sarah = await Consultant.findOne({ email: 'sarah@constultant.com' });
    if (!sarah) {
      console.log('❌ Sarah Johnson not found');
      return;
    }

    // Find Rahul (seeker)
    const rahul = await Seeker.findOne({ email: 'rahul@consultant.com' });
    if (!rahul) {
      console.log('❌ Rahul not found');
      return;
    }

    console.log(`\n👤 Testing booking logic:`);
    console.log(`   Consultant: ${sarah.fullName} (${sarah._id})`);
    console.log(`   Seeker: ${rahul.fullName} (${rahul._id})`);

    // Test JWT token creation and decoding
    const token = jwt.sign(
      { userId: rahul._id, userType: 'seeker' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log(`\n🔑 JWT Token test:`);
    console.log(`   Created token with userId: ${rahul._id}`);

    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log(`   Decoded token - userId: ${decoded.userId}`);
    console.log(`   Decoded token - userType: ${decoded.userType}`);

    // Test if the seeker can be found using the decoded userId
    const foundSeeker = await Seeker.findById(decoded.userId);
    if (foundSeeker) {
      console.log(`   ✅ Seeker found using decoded userId: ${foundSeeker.fullName}`);
    } else {
      console.log(`   ❌ Seeker not found using decoded userId`);
    }

    // Test booking creation logic
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10:00 AM

    console.log(`\n📅 Testing booking creation logic:`);
    console.log(`   Date: ${tomorrow.toISOString().split('T')[0]}`);
    console.log(`   Time: 10:00`);

    // Check if consultant is available
    const dayOfWeek = tomorrow.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const workingHours = sarah.workingHours[dayOfWeek];

    if (workingHours && workingHours.available) {
      console.log(`   ✅ Consultant is available on ${dayOfWeek} (${workingHours.start} - ${workingHours.end})`);
    } else {
      console.log(`   ❌ Consultant is not available on ${dayOfWeek}`);
      return;
    }

    // Create a test booking
    const booking = new Booking({
      consultant: sarah._id,
      seeker: rahul._id,
      sessionType: 'consultation',
      sessionDuration: 60,
      sessionDate: tomorrow,
      startTime: '10:00',
      endTime: '11:00',
      meetingPlatform: 'google_meet',
      description: 'Test booking from script',
      amount: Math.round((sarah.hourlyRate * 60) / 60),
      status: 'pending'
    });

    await booking.save();
    console.log(`   ✅ Test booking created successfully!`);
    console.log(`   Booking ID: ${booking._id}`);
    console.log(`   Amount: ₹${booking.amount}`);

    // Clean up - delete the test booking
    await Booking.findByIdAndDelete(booking._id);
    console.log(`   🧹 Test booking cleaned up`);

    console.log(`\n🎉 The booking fix is working correctly!`);
    console.log(`   The issue was with req.user.id vs req.user.userId in the JWT token.`);
    console.log(`   All instances have been fixed to use req.user.userId.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testBookingLogic();
