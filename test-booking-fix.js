const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
require('dotenv').config();

async function testBookingFix() {
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

    console.log(`\n👤 Testing booking creation:`);
    console.log(`   Consultant: ${sarah.fullName} (${sarah._id})`);
    console.log(`   Seeker: ${rahul.fullName} (${rahul._id})`);

    // Create a JWT token for Rahul (seeker)
    const token = jwt.sign(
      { userId: rahul._id, userType: 'seeker' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log(`\n🔑 Created JWT token for seeker`);
    console.log(`   Token payload: userId=${rahul._id}, userType=seeker`);

    // Test booking creation
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10:00 AM

    const bookingData = {
      consultantId: sarah._id,
      sessionType: 'consultation',
      sessionDuration: 60,
      sessionDate: tomorrow.toISOString(),
      startTime: '10:00',
      meetingPlatform: 'google_meet',
      description: 'Test booking from script'
    };

    console.log(`\n📅 Creating test booking:`);
    console.log(`   Date: ${tomorrow.toISOString().split('T')[0]}`);
    console.log(`   Time: 10:00`);
    console.log(`   Duration: 60 minutes`);

    // Make the API call
    const response = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    if (!response.ok) {
      console.log(`❌ Booking creation failed: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error details: ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`\n✅ Booking created successfully!`);
    console.log(`   Booking ID: ${result.booking._id}`);
    console.log(`   Status: ${result.booking.status}`);
    console.log(`   Amount: ₹${result.booking.amount}`);

    console.log(`\n🎉 The booking fix is working correctly!`);
    console.log(`   Seekers can now successfully create bookings.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testBookingFix();
