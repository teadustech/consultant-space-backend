const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function debugDateIssue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    // Simulate the exact booking scenario
    console.log('\n🔍 Debugging Date Comparison Issue:');
    
    // Current date and time
    const now = new Date();
    console.log(`   Current time (now): ${now.toISOString()}`);
    console.log(`   Current time (local): ${now.toString()}`);
    
    // Simulate the booking date (August 8th, 2025 at 12:00)
    const sessionDate = '2025-08-08'; // This is what the frontend sends
    const startTime = '12:00';
    
    console.log(`   Session date from frontend: ${sessionDate}`);
    console.log(`   Start time: ${startTime}`);
    
    // This is how the backend creates the booking date
    const bookingDate = new Date(sessionDate);
    console.log(`   Booking date (new Date(sessionDate)): ${bookingDate.toISOString()}`);
    console.log(`   Booking date (local): ${bookingDate.toString()}`);
    
    // The issue: bookingDate is set to midnight UTC, not 12:00
    console.log(`\n❌ PROBLEM: The booking date is set to midnight UTC, not 12:00!`);
    
    // Let's fix this by setting the correct time
    const [year, month, day] = sessionDate.split('-');
    const [hour, minute] = startTime.split(':');
    
    // Create date with the correct time
    const correctBookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    console.log(`   Correct booking date: ${correctBookingDate.toISOString()}`);
    console.log(`   Correct booking date (local): ${correctBookingDate.toString()}`);
    
    // Test the comparison
    console.log(`\n🧪 Testing Date Comparisons:`);
    console.log(`   bookingDate < now: ${bookingDate < now}`);
    console.log(`   correctBookingDate < now: ${correctBookingDate < now}`);
    
    if (bookingDate < now) {
      console.log(`   ❌ Original logic fails: bookingDate is in the past`);
    } else {
      console.log(`   ✅ Original logic works`);
    }
    
    if (correctBookingDate < now) {
      console.log(`   ❌ Corrected logic fails: correctBookingDate is in the past`);
    } else {
      console.log(`   ✅ Corrected logic works`);
    }
    
    // Calculate time differences
    const hoursUntilSession = (correctBookingDate - now) / (1000 * 60 * 60);
    const daysUntilSession = hoursUntilSession / 24;
    
    console.log(`\n📅 Time Calculations:`);
    console.log(`   Hours until session: ${hoursUntilSession.toFixed(2)}`);
    console.log(`   Days until session: ${daysUntilSession.toFixed(2)}`);
    
    // Test with a consultant's booking notice settings
    const sarah = await Consultant.findOne({ email: 'sarah@constultant.com' });
    if (sarah) {
      console.log(`\n👤 Consultant Settings:`);
      console.log(`   minBookingNotice: ${sarah.minBookingNotice} hours`);
      console.log(`   maxBookingAdvance: ${sarah.maxBookingAdvance} days`);
      
      if (hoursUntilSession < sarah.minBookingNotice) {
        console.log(`   ❌ Fails minimum notice: ${hoursUntilSession.toFixed(2)} < ${sarah.minBookingNotice}`);
      } else {
        console.log(`   ✅ Passes minimum notice: ${hoursUntilSession.toFixed(2)} >= ${sarah.minBookingNotice}`);
      }
      
      if (daysUntilSession > sarah.maxBookingAdvance) {
        console.log(`   ❌ Fails maximum advance: ${daysUntilSession.toFixed(2)} > ${sarah.maxBookingAdvance}`);
      } else {
        console.log(`   ✅ Passes maximum advance: ${daysUntilSession.toFixed(2)} <= ${sarah.maxBookingAdvance}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugDateIssue();
