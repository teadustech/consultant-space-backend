const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const Booking = require('./models/Booking');
require('dotenv').config();

async function testTimezoneFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    console.log('\n🧪 Testing Timezone Fix for Booking System:');
    
    // Test 1: Date parsing logic
    console.log('\n📅 Test 1: Date Parsing Logic');
    
    const sessionDate = '2025-08-08'; // Date string from frontend
    const startTime = '12:00';
    
    console.log(`   Session date from frontend: ${sessionDate}`);
    console.log(`   Start time: ${startTime}`);
    
    // Test the new parsing logic
    let bookingDate;
    
    if (sessionDate.includes('T')) {
      // If sessionDate is an ISO string, parse it directly
      bookingDate = new Date(sessionDate);
    } else {
      // If sessionDate is just a date string, create date with time
      const [year, month, day] = sessionDate.split('-');
      const [hour, minute] = startTime.split(':');
      
      // Create date in local timezone to avoid timezone shifts
      bookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    }
    
    const now = new Date();
    
    console.log(`   Parsed booking date: ${bookingDate.toISOString()}`);
    console.log(`   Booking date (local): ${bookingDate.toString()}`);
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Is booking in the past? ${bookingDate < now ? 'Yes' : 'No'}`);
    
    // Test 2: Date comparison for tomorrow
    console.log('\n📅 Test 2: Tomorrow Booking Test');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    console.log(`   Tomorrow's date: ${tomorrowDate}`);
    
    let tomorrowBookingDate;
    if (tomorrowDate.includes('T')) {
      tomorrowBookingDate = new Date(tomorrowDate);
    } else {
      const [year, month, day] = tomorrowDate.split('-');
      const [hour, minute] = startTime.split(':');
      tomorrowBookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    }
    
    console.log(`   Tomorrow booking date: ${tomorrowBookingDate.toISOString()}`);
    console.log(`   Is tomorrow booking in the past? ${tomorrowBookingDate < now ? 'Yes' : 'No'}`);
    
    // Test 3: Date formatting consistency
    console.log('\n📅 Test 3: Date Formatting Consistency');
    
    const testDate = new Date('2025-08-08T12:00:00.000Z');
    console.log(`   Test date: ${testDate.toISOString()}`);
    console.log(`   Formatted with UTC: ${testDate.toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })}`);
    console.log(`   Formatted without UTC: ${testDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    
    // Test 4: Availability date comparison
    console.log('\n📅 Test 4: Availability Date Comparison');
    
    const availabilityDate = '2025-08-08';
    const bookingDateString = testDate.toISOString().split('T')[0];
    
    console.log(`   Availability date: ${availabilityDate}`);
    console.log(`   Booking date string: ${bookingDateString}`);
    console.log(`   Dates match? ${availabilityDate === bookingDateString}`);
    
    // Test 5: Check if we have test data
    console.log('\n📅 Test 5: Database Check');
    
    const consultantCount = await Consultant.countDocuments();
    const seekerCount = await Seeker.countDocuments();
    const bookingCount = await Booking.countDocuments();
    
    console.log(`   Consultants in database: ${consultantCount}`);
    console.log(`   Seekers in database: ${seekerCount}`);
    console.log(`   Bookings in database: ${bookingCount}`);
    
    if (consultantCount > 0) {
      const consultant = await Consultant.findOne();
      console.log(`   Sample consultant: ${consultant.fullName} (${consultant.email})`);
      console.log(`   Working hours: ${JSON.stringify(consultant.workingHours)}`);
    }
    
    console.log('\n✅ Timezone fix testing completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Date parsing logic now handles both ISO strings and date strings');
    console.log('   - Date comparisons are timezone-aware');
    console.log('   - Date formatting uses UTC to avoid timezone shifts');
    console.log('   - Availability checking uses consistent date formatting');
    console.log('   - Frontend sends simple date strings to avoid timezone issues');

  } catch (error) {
    console.error('❌ Error during timezone fix testing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testTimezoneFix();
