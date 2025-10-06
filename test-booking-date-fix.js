const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testBookingDateFix() {
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

    console.log(`\n🔍 Testing Booking Date Fix:`);
    console.log(`   Consultant: ${sarah.fullName}`);
    console.log(`   Seeker: ${rahul.fullName}`);

    // Test the exact scenario from the frontend
    const sessionDate = '2025-08-08';  // August 8th, 2025
    const startTime = '12:00';         // 12:00 PM

    console.log(`\n📅 Test Booking Details:`);
    console.log(`   Date: ${sessionDate}`);
    console.log(`   Time: ${startTime}`);

    // Test the new date creation logic
    const [year, month, day] = sessionDate.split('-');
    const [hour, minute] = startTime.split(':');
    const bookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    const now = new Date();

    console.log(`\n🔍 Date Comparison:`);
    console.log(`   bookingDate (ISO): ${bookingDate.toISOString()}`);
    console.log(`   bookingDate (local): ${bookingDate.toString()}`);
    console.log(`   now (ISO): ${now.toISOString()}`);
    console.log(`   now (local): ${now.toString()}`);
    console.log(`   bookingDate < now: ${bookingDate < now}`);

    if (bookingDate < now) {
      console.log(`   ❌ Booking date is in the past!`);
    } else {
      console.log(`   ✅ Booking date is in the future!`);
    }

    // Test minimum booking notice
    const hoursUntilSession = (bookingDate - now) / (1000 * 60 * 60);
    console.log(`\n⏰ Booking Notice Check:`);
    console.log(`   Hours until session: ${hoursUntilSession.toFixed(2)}`);
    console.log(`   Min booking notice: ${sarah.minBookingNotice} hours`);
    console.log(`   Meets minimum notice: ${hoursUntilSession >= sarah.minBookingNotice}`);

    // Test maximum booking advance
    const daysUntilSession = hoursUntilSession / 24;
    console.log(`\n📅 Booking Advance Check:`);
    console.log(`   Days until session: ${daysUntilSession.toFixed(2)}`);
    console.log(`   Max booking advance: ${sarah.maxBookingAdvance} days`);
    console.log(`   Within advance limit: ${daysUntilSession <= sarah.maxBookingAdvance}`);

    // Test working hours
    const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const workingHours = sarah.workingHours[dayOfWeek];
    
    console.log(`\n🕐 Working Hours Check:`);
    console.log(`   Day of week: ${dayOfWeek}`);
    console.log(`   Working hours: ${workingHours ? `${workingHours.start} - ${workingHours.end}` : 'Not set'}`);
    console.log(`   Available: ${workingHours ? workingHours.available : false}`);

    if (workingHours && workingHours.available) {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [workStartHour, workStartMinute] = workingHours.start.split(':').map(Number);
      const [workEndHour, workEndMinute] = workingHours.end.split(':').map(Number);

      const bookingStartMinutes = startHour * 60 + startMinute;
      const workStartMinutes = workStartHour * 60 + workStartMinute;
      const workEndMinutes = workEndHour * 60 + workEndMinute;

      console.log(`   Booking time (minutes): ${bookingStartMinutes}`);
      console.log(`   Work start (minutes): ${workStartMinutes}`);
      console.log(`   Work end (minutes): ${workEndMinutes}`);
      console.log(`   Within working hours: ${bookingStartMinutes >= workStartMinutes && bookingStartMinutes < workEndMinutes}`);
    }

    console.log(`\n🎉 Date fix test completed!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testBookingDateFix();
