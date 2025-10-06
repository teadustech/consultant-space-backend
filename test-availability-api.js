const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const fetch = require('node-fetch');
require('dotenv').config();

async function testAvailabilityAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    // Find Sarah Johnson
    const sarah = await Consultant.findOne({ email: 'sarah@constultant.com' });
    
    if (!sarah) {
      console.log('❌ Sarah Johnson not found');
      return;
    }

    console.log(`\n👤 Testing availability for: ${sarah.fullName} (${sarah._id})`);

    // Test the availability API endpoint
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`\n📅 Testing API endpoint:`);
    console.log(`   URL: http://localhost:5000/api/bookings/consultant/${sarah._id}/availability`);
    console.log(`   Start Date: ${startDate}`);
    console.log(`   End Date: ${endDate}`);

    // Make the API call
    const response = await fetch(`http://localhost:5000/api/bookings/consultant/${sarah._id}/availability?startDate=${startDate}&endDate=${endDate}`);
    
    if (!response.ok) {
      console.log(`❌ API Error: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error details: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log(`\n✅ API Response:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Availability days: ${data.availability.length}`);

    // Display the availability
    data.availability.forEach(day => {
      console.log(`\n   📅 ${day.date} (${day.dayOfWeek}):`);
      console.log(`      Working Hours: ${day.workingHours.start} - ${day.workingHours.end}`);
      console.log(`      Available Slots: ${day.availableSlots.length}`);
      console.log(`      Booked Slots: ${day.bookedSlots.length}`);
      
      if (day.availableSlots.length > 0) {
        console.log(`      First 5 available slots: ${day.availableSlots.slice(0, 5).join(', ')}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testAvailabilityAPI();
