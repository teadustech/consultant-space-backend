const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const fetch = require('node-fetch');
require('dotenv').config();

async function testFrontendFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    // Find Sarah Johnson
    const sarah = await Consultant.findOne({ email: 'sarah@constultant.com' });
    
    if (!sarah) {
      console.log('❌ Sarah Johnson not found');
      return;
    }

    console.log(`\n👤 Testing frontend flow for: ${sarah.fullName} (${sarah._id})`);

    // Simulate the frontend flow
    console.log('\n📅 Step 1: Load consultant profile');
    console.log(`   Consultant ID: ${sarah._id}`);
    console.log(`   Name: ${sarah.fullName}`);
    console.log(`   Available: ${sarah.isAvailable}`);

    // Simulate loading availability for current month
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    console.log('\n📅 Step 2: Load availability for current month');
    console.log(`   Start Date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   End Date: ${endDate.toISOString().split('T')[0]}`);

    // Make the API call
    const response = await fetch(`http://localhost:5000/api/bookings/consultant/${sarah._id}/availability?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`);
    
    if (!response.ok) {
      console.log(`❌ API Error: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.log(`   Error details: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log(`\n✅ Step 3: API Response received`);
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

    // Simulate selecting a date
    const availableDay = data.availability.find(day => day.availableSlots.length > 0);
    if (availableDay) {
      console.log(`\n📅 Step 4: Simulate selecting a date`);
      console.log(`   Selected Date: ${availableDay.date}`);
      console.log(`   Available Times: ${availableDay.availableSlots.slice(0, 5).join(', ')}...`);
      
      // Simulate selecting a time
      const selectedTime = availableDay.availableSlots[0];
      console.log(`   Selected Time: ${selectedTime}`);
      
      console.log(`\n✅ Frontend flow simulation completed successfully!`);
      console.log(`   The seeker should now be able to see availability and select times.`);
    } else {
      console.log(`\n❌ No available days found in the current month`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testFrontendFlow();
