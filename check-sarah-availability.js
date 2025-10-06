const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
require('dotenv').config();

async function checkSarahAvailability() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    // Find Sarah Johnson
    const sarah = await Consultant.findOne({ email: 'sarah@constultant.com' });
    
    if (!sarah) {
      console.log('❌ Sarah Johnson not found');
      return;
    }

    console.log('\n👤 Sarah Johnson Details:');
    console.log(`   Name: ${sarah.fullName}`);
    console.log(`   Email: ${sarah.email}`);
    console.log(`   Available: ${sarah.isAvailable}`);
    console.log(`   Verified: ${sarah.isVerified}`);
    console.log(`   Domain: ${sarah.domain}`);
    console.log(`   Hourly Rate: ₹${sarah.hourlyRate}`);

    console.log('\n📅 Working Hours:');
    if (sarah.workingHours) {
      Object.keys(sarah.workingHours).forEach(day => {
        const hours = sarah.workingHours[day];
        console.log(`   ${day}: ${hours.available ? 'Available' : 'Not Available'} ${hours.available ? `(${hours.start} - ${hours.end})` : ''}`);
      });
    } else {
      console.log('   ❌ No working hours set');
    }

    console.log('\n⚙️ Booking Preferences:');
    console.log(`   Min Booking Notice: ${sarah.minBookingNotice || 'Not set'} hours`);
    console.log(`   Max Booking Advance: ${sarah.maxBookingAdvance || 'Not set'} days`);

    // Test availability generation
    console.log('\n🧪 Testing Availability Generation:');
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`   Testing date range: ${startDate} to ${endDate}`);

    // Simulate the availability logic
    const availability = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const workingHours = sarah.workingHours?.[dayOfWeek];

      if (workingHours?.available) {
        console.log(`   ✅ ${currentDate.toISOString().split('T')[0]} (${dayOfWeek}): Available ${workingHours.start} - ${workingHours.end}`);
      } else {
        console.log(`   ❌ ${currentDate.toISOString().split('T')[0]} (${dayOfWeek}): Not available`);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkSarahAvailability();
