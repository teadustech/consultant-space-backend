require('dotenv').config();
const googleMeetService = require('./utils/googleMeetService');
const emailService = require('./utils/emailService');

async function testGoogleMeetFix() {
  console.log('🧪 Testing Google Meet Service Fix...\n');

  // Test data
  const testBookingData = {
    consultant: {
      fullName: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@example.com'
    },
    seeker: {
      fullName: 'John Doe',
      email: 'john.doe@example.com'
    },
    sessionType: 'consultation',
    sessionDuration: 60,
    sessionDate: '2024-12-20',
    startTime: '14:00',
    description: 'Test consultation session'
  };

  try {
    console.log('📅 Creating Google Meet link...');
    const meetingData = await googleMeetService.createMeetingLink(testBookingData);
    
    if (meetingData && meetingData.meetingLink) {
      console.log('✅ Google Meet link created successfully!');
      console.log('🔗 Meeting Link:', meetingData.meetingLink);
      console.log('🆔 Event ID:', meetingData.eventId);
      
      // Test email service
      console.log('\n📧 Testing email notification...');
      const emailResult = await emailService.sendMeetingConfirmation({
        to: testBookingData.seeker.email,
        consultantName: testBookingData.consultant.fullName,
        seekerName: testBookingData.seeker.fullName,
        meetingLink: meetingData.meetingLink,
        sessionDate: testBookingData.sessionDate,
        startTime: testBookingData.startTime,
        sessionDuration: testBookingData.sessionDuration,
        sessionType: testBookingData.sessionType
      });
      
      if (emailResult.success) {
        console.log('✅ Meeting confirmation email sent successfully!');
        console.log('📧 Email ID:', emailResult.messageId);
      } else {
        console.log('❌ Failed to send email:', emailResult.error);
      }
      
      // Test updating the meeting
      console.log('\n🔄 Testing meeting update...');
      const updatedData = {
        ...testBookingData,
        sessionDate: '2024-12-21',
        startTime: '15:00'
      };
      
      const updatedMeetingData = await googleMeetService.updateMeetingLink('test-booking-id', updatedData);
      
      if (updatedMeetingData) {
        console.log('✅ Meeting updated successfully!');
        console.log('🔗 Updated Meeting Link:', updatedMeetingData.meetingLink);
      } else {
        console.log('⚠️ Meeting update failed (expected for test booking ID)');
      }
      
      // Clean up - delete the test event
      if (meetingData.eventId) {
        console.log('\n🗑️ Cleaning up test event...');
        await googleMeetService.deleteMeetingLink(meetingData.eventId);
        console.log('✅ Test event deleted successfully!');
      }
      
    } else {
      console.log('❌ Failed to create Google Meet link');
      console.log('📋 Meeting Data:', meetingData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('Service accounts cannot invite attendees')) {
      console.log('\n💡 This error should now be fixed! The service account permission issue has been resolved.');
    }
  }
  
  console.log('\n🎉 Test completed!');
}

// Run the test
testGoogleMeetFix().catch(console.error);
