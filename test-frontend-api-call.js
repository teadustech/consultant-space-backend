const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
require('dotenv').config();

async function testFrontendAPICall() {
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

    // Create a JWT token exactly like the frontend would
    const token = jwt.sign(
      { userId: rahul._id, userType: 'seeker' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log(`\n🔑 JWT Token:`);
    console.log(`   Token: ${token.substring(0, 50)}...`);
    
    // Decode to verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log(`   Decoded: userId=${decoded.userId}, userType=${decoded.userType}`);

    // Test booking creation with tomorrow's date
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
      description: 'Test booking from debug script'
    };

    console.log(`\n📅 Making API call:`);
    console.log(`   URL: http://localhost:5000/api/bookings`);
    console.log(`   Method: POST`);
    console.log(`   Date: ${tomorrow.toISOString().split('T')[0]}`);
    console.log(`   Time: 10:00`);

    // Make the API call
    const response = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    console.log(`\n📡 Response:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
      
      // Try to parse as JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.log(`   Parsed error:`, errorJson);
      } catch (e) {
        console.log(`   Raw error text: ${errorText}`);
      }
    } else {
      const result = await response.json();
      console.log(`   Success:`, result);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testFrontendAPICall();
