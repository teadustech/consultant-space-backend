const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function testActualBooking() {
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

    console.log(`\n🔍 Testing Actual Booking API:`);
    console.log(`   Consultant: ${sarah.fullName} (${sarah._id})`);
    console.log(`   Seeker: ${rahul.fullName} (${rahul._id})`);

    // Create JWT token for the seeker
    const token = jwt.sign(
      { userId: rahul._id, userType: 'seeker' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Test booking data
    const bookingData = {
      sessionDate: '2025-08-08',
      startTime: '12:00',
      sessionType: 'consultation',
      sessionDuration: 60,
      meetingPlatform: 'google_meet',
      description: 'Test booking from API'
    };

    console.log(`\n📅 Booking Data:`);
    console.log(`   Date: ${bookingData.sessionDate}`);
    console.log(`   Time: ${bookingData.startTime}`);

    try {
      const response = await axios.post(
        `http://localhost:5000/api/bookings/${sarah._id}`,
        bookingData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`\n✅ Booking successful!`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Booking ID: ${response.data.booking._id}`);

    } catch (error) {
      console.log(`\n❌ Booking failed!`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data.message}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testActualBooking();
