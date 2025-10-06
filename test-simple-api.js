const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const Booking = require('./models/Booking');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testSimpleAPI() {
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

    console.log(`\n👤 Test Setup:`);
    console.log(`   Consultant: ${sarah.fullName} (${sarah._id})`);
    console.log(`   Seeker: ${rahul.fullName} (${rahul._id})`);

    // Create a JWT token
    const token = jwt.sign(
      { userId: rahul._id, userType: 'seeker' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Decode the token to simulate req.user
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    console.log(`\n🔑 Simulating req.user:`);
    console.log(`   req.user:`, decoded);
    console.log(`   req.user.userId: ${decoded.userId}`);
    console.log(`   req.user.userType: ${decoded.userType}`);

    // Simulate the booking route logic
    console.log(`\n🧪 Testing booking route logic:`);
    
    const seekerId = decoded.userId;
    console.log(`   seekerId: ${seekerId}`);
    console.log(`   seekerId type: ${typeof seekerId}`);

    // Check if seeker exists (this is the line that was failing)
    console.log(`   Looking for seeker with ID: ${seekerId}`);
    const seeker = await Seeker.findById(seekerId);
    console.log(`   Seeker found: ${seeker ? seeker.fullName : 'NOT FOUND'}`);
    
    if (!seeker) {
      console.log(`   ❌ Seeker not found - this is the issue!`);
      return;
    }

    console.log(`   ✅ Seeker found successfully: ${seeker.fullName}`);

    // Test creating a booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const booking = new Booking({
      consultant: sarah._id,
      seeker: seekerId,
      sessionType: 'consultation',
      sessionDuration: 60,
      sessionDate: tomorrow,
      startTime: '10:00',
      endTime: '11:00',
      meetingPlatform: 'google_meet',
      description: 'Test booking',
      amount: Math.round((sarah.hourlyRate * 60) / 60),
      status: 'pending'
    });

    await booking.save();
    console.log(`   ✅ Booking created successfully!`);
    console.log(`   Booking ID: ${booking._id}`);
    console.log(`   Amount: ₹${booking.amount}`);

    // Clean up
    await Booking.findByIdAndDelete(booking._id);
    console.log(`   🧹 Test booking cleaned up`);

    console.log(`\n🎉 The booking logic is working correctly!`);
    console.log(`   The issue might be with the server not being restarted or a caching issue.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testSimpleAPI();
