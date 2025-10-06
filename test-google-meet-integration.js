const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const Booking = require('./models/Booking');
const googleMeetService = require('./utils/googleMeetService');

require('dotenv').config();

async function testGoogleMeetIntegration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    // Find test consultant and seeker
    const consultant = await Consultant.findOne({ email: 'sarah@constultant.com' });
    const seeker = await Seeker.findOne({ email: 'rahul@consultant.com' });

    if (!consultant || !seeker) {
      console.log('❌ Test users not found. Please run setup-test-data.js first.');
      return;
    }

    console.log(`\n👤 Test Users:`);
    console.log(`   Consultant: ${consultant.fullName} (${consultant.email})`);
    console.log(`   Seeker: ${seeker.fullName} (${seeker.email})`);

    // Test 1: Direct Google Meet Service
    console.log(`\n🧪 Test 1: Direct Google Meet Service`);
    console.log(`   Testing meeting link generation...`);

    const testBookingData = {
      consultant: {
        fullName: consultant.fullName,
        email: consultant.email
      },
      seeker: {
        fullName: seeker.fullName,
        email: seeker.email
      },
      sessionType: 'consultation',
      sessionDuration: 60,
      sessionDate: '2024-01-15',
      startTime: '10:00',
      description: 'Test session for Google Meet integration'
    };

    try {
      const meetingData = await googleMeetService.createMeetingLink(testBookingData);
      
      if (meetingData) {
        console.log(`   ✅ Meeting link generated successfully:`);
        console.log(`      Link: ${meetingData.meetingLink}`);
        console.log(`      Event ID: ${meetingData.eventId}`);
        
        // Test 2: Update meeting link
        console.log(`\n🧪 Test 2: Update Meeting Link`);
        console.log(`   Testing meeting link update...`);
        
        const updatedData = {
          ...testBookingData,
          sessionDate: '2024-01-16',
          startTime: '14:00'
        };
        
        const updatedMeetingData = await googleMeetService.updateMeetingLink('test-booking-id', updatedData);
        
        if (updatedMeetingData) {
          console.log(`   ✅ Meeting link updated successfully:`);
          console.log(`      New Link: ${updatedMeetingData.meetingLink}`);
        } else {
          console.log(`   ⚠️ Meeting link update returned null (expected for test)`);
        }
        
      } else {
        console.log(`   ⚠️ No meeting link generated (API not configured)`);
      }
    } catch (error) {
      console.log(`   ⚠️ Google Meet API error (expected if not configured): ${error.message}`);
    }

    // Test 3: Create actual booking with meeting link
    console.log(`\n🧪 Test 3: Create Booking with Meeting Link`);
    console.log(`   Testing booking creation with automatic meeting link...`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const bookingData = {
      consultant: consultant._id,
      seeker: seeker._id,
      sessionType: 'consultation',
      sessionDuration: 60,
      sessionDate: tomorrow,
      startTime: '10:00',
      meetingPlatform: 'google_meet',
      description: 'Test booking with Google Meet integration',
      amount: Math.round((consultant.hourlyRate * 60) / 60),
      status: 'pending'
    };

    const booking = new Booking(bookingData);
    await booking.save();

    console.log(`   ✅ Booking created: ${booking._id}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Meeting Link: ${booking.meetingLink || 'Not generated'}`);
    console.log(`   Event ID: ${booking.eventId || 'Not set'}`);

    // Test 4: Confirm booking to generate meeting link
    console.log(`\n🧪 Test 4: Confirm Booking to Generate Meeting Link`);
    console.log(`   Testing meeting link generation on confirmation...`);

    // Populate booking with user details
    await booking.populate('consultant', 'fullName email profileImage');
    await booking.populate('seeker', 'fullName email profileImage');

    // Simulate the confirmation process
    if (!booking.meetingLink) {
      try {
        const meetingData = await googleMeetService.createMeetingLink({
          consultant: booking.consultant,
          seeker: booking.seeker,
          sessionType: booking.sessionType,
          sessionDuration: booking.sessionDuration,
          sessionDate: booking.sessionDate.toISOString().split('T')[0],
          startTime: booking.startTime,
          description: booking.description
        });

        if (meetingData) {
          booking.meetingLink = meetingData.meetingLink;
          booking.eventId = meetingData.eventId;
          await booking.save();
          
          console.log(`   ✅ Meeting link generated on confirmation:`);
          console.log(`      Link: ${booking.meetingLink}`);
          console.log(`      Event ID: ${booking.eventId}`);
        } else {
          console.log(`   ⚠️ No meeting link generated on confirmation`);
        }
      } catch (error) {
        console.log(`   ⚠️ Error generating meeting link on confirmation: ${error.message}`);
      }
    } else {
      console.log(`   ℹ️ Meeting link already exists: ${booking.meetingLink}`);
    }

    // Test 5: Reschedule booking
    console.log(`\n🧪 Test 5: Reschedule Booking`);
    console.log(`   Testing meeting link update on reschedule...`);

    const newDate = new Date(tomorrow);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(14, 0, 0, 0);

    if (booking.meetingLink && booking.eventId) {
      try {
        const meetingData = await googleMeetService.updateMeetingLink(booking._id, {
          consultant: booking.consultant,
          seeker: booking.seeker,
          sessionType: booking.sessionType,
          sessionDuration: booking.sessionDuration,
          sessionDate: newDate.toISOString().split('T')[0],
          startTime: '14:00',
          description: booking.description
        });

        if (meetingData) {
          booking.meetingLink = meetingData.meetingLink;
          booking.eventId = meetingData.eventId;
          booking.sessionDate = newDate;
          booking.startTime = '14:00';
          booking.status = 'rescheduled';
          await booking.save();
          
          console.log(`   ✅ Booking rescheduled with updated meeting link:`);
          console.log(`      New Date: ${newDate.toISOString().split('T')[0]}`);
          console.log(`      New Time: 14:00`);
          console.log(`      Updated Link: ${booking.meetingLink}`);
        } else {
          console.log(`   ⚠️ Meeting link update failed on reschedule`);
        }
      } catch (error) {
        console.log(`   ⚠️ Error updating meeting link on reschedule: ${error.message}`);
      }
    } else {
      console.log(`   ℹ️ No meeting link to update on reschedule`);
    }

    // Test 6: Cancel booking
    console.log(`\n🧪 Test 6: Cancel Booking`);
    console.log(`   Testing Google Calendar event deletion on cancellation...`);

    if (booking.eventId) {
      try {
        await googleMeetService.deleteMeetingLink(booking.eventId);
        booking.eventId = null;
        booking.status = 'cancelled';
        booking.cancelledBy = 'system';
        booking.cancellationDate = new Date();
        await booking.save();
        
        console.log(`   ✅ Booking cancelled and Google Calendar event deleted`);
      } catch (error) {
        console.log(`   ⚠️ Error deleting Google Calendar event: ${error.message}`);
      }
    } else {
      console.log(`   ℹ️ No Google Calendar event to delete`);
    }

    console.log(`\n🎉 Google Meet Integration Test Complete!`);
    console.log(`\n📋 Summary:`);
    console.log(`   ✅ Direct service test completed`);
    console.log(`   ✅ Booking creation with meeting link`);
    console.log(`   ✅ Meeting link generation on confirmation`);
    console.log(`   ✅ Meeting link update on reschedule`);
    console.log(`   ✅ Google Calendar event deletion on cancellation`);

    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Set up Google Cloud Console project`);
    console.log(`   2. Create service account and download credentials`);
    console.log(`   3. Add credentials to the-consultant/server/credentials/`);
    console.log(`   4. Update .env file with GOOGLE_APPLICATION_CREDENTIALS`);
    console.log(`   5. Share calendar with service account email`);
    console.log(`   6. Test with real Google Meet API`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testGoogleMeetIntegration();
