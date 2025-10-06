const { google } = require('googleapis');

class GoogleMeetService {
  constructor() {
    this.calendar = null;
    this.initializeCalendar();
  }

  initializeCalendar() {
    try {
      // Initialize Google Calendar API
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ]
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      console.log('✅ Google Calendar API initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar API:', error.message);
      this.calendar = null;
    }
  }

  async createMeetingLink(bookingData) {
    try {
      if (!this.calendar) {
        console.warn('⚠️ Google Calendar API not initialized, skipping meeting link generation');
        return null;
      }

      const {
        consultant,
        seeker,
        sessionType,
        sessionDuration,
        sessionDate,
        startTime,
        description = ''
      } = bookingData;

      // Parse session date and time
      const [year, month, day] = sessionDate.split('-').map(Number);
      const [hours, minutes] = startTime.split(':').map(Number);
      
      const startDateTime = new Date(year, month - 1, day, hours, minutes);
      const endDateTime = new Date(startDateTime.getTime() + sessionDuration * 60000);

      // Format dates for Google Calendar API
      const startTimeISO = startDateTime.toISOString();
      const endTimeISO = endDateTime.toISOString();

      // Create event details without attendees to avoid service account permission issues
      const event = {
        summary: `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session - ${consultant.fullName}`,
        description: `${description || `Session with ${consultant.fullName}`}\n\nParticipants:\n- Consultant: ${consultant.fullName} (${consultant.email})\n- Seeker: ${seeker.fullName} (${seeker.email})`,
        start: {
          dateTime: startTimeISO,
          timeZone: 'Asia/Kolkata', // IST timezone
        },
        end: {
          dateTime: endTimeISO,
          timeZone: 'Asia/Kolkata',
        },
        // Remove attendees to avoid service account permission issues
        // attendees: [
        //   { email: consultant.email, displayName: consultant.fullName },
        //   { email: seeker.email, displayName: seeker.fullName }
        // ],
        conferenceData: {
          createRequest: {
            requestId: `booking-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 } // 15 minutes before (removed email reminder)
          ]
        }
      };

      // Create the calendar event with Google Meet without sending updates
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        // Remove sendUpdates to avoid service account permission issues
        // sendUpdates: 'all'
      });

      const meetingLink = response.data.conferenceData?.entryPoints?.[0]?.uri;
      
      if (meetingLink) {
        console.log('✅ Google Meet link generated successfully:', meetingLink);
        return {
          meetingLink,
          eventId: response.data.id,
          joinUrl: meetingLink
        };
      } else {
        console.warn('⚠️ No meeting link generated from Google Calendar API');
        return null;
      }

    } catch (error) {
      console.error('❌ Error creating Google Meet link:', error.message);
      
      // Return a fallback meeting link format
      return {
        meetingLink: `https://meet.google.com/${this.generateMeetingId()}`,
        eventId: null,
        joinUrl: `https://meet.google.com/${this.generateMeetingId()}`
      };
    }
  }

  generateMeetingId() {
    // Generate a random meeting ID (3 groups of 3 characters separated by dashes)
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const groups = [];
    
    for (let i = 0; i < 3; i++) {
      let group = '';
      for (let j = 0; j < 3; j++) {
        group += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      groups.push(group);
    }
    
    return groups.join('-');
  }

  async updateMeetingLink(bookingId, newBookingData) {
    try {
      if (!this.calendar) {
        console.warn('⚠️ Google Calendar API not initialized, skipping meeting link update');
        return null;
      }

      // First, try to find the existing event
      const existingBooking = await require('../models/Booking').findById(bookingId);
      if (!existingBooking || !existingBooking.eventId) {
        // If no existing event, create a new one
        return await this.createMeetingLink(newBookingData);
      }

      // Update the existing event
      const {
        consultant,
        seeker,
        sessionType,
        sessionDuration,
        sessionDate,
        startTime,
        description = ''
      } = newBookingData;

      // Parse session date and time
      const [year, month, day] = sessionDate.split('-').map(Number);
      const [hours, minutes] = startTime.split(':').map(Number);
      
      const startDateTime = new Date(year, month - 1, day, hours, minutes);
      const endDateTime = new Date(startDateTime.getTime() + sessionDuration * 60000);

      const event = {
        summary: `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session - ${consultant.fullName}`,
        description: `${description || `Session with ${consultant.fullName}`}\n\nParticipants:\n- Consultant: ${consultant.fullName} (${consultant.email})\n- Seeker: ${seeker.fullName} (${seeker.email})`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        }
        // Remove attendees to avoid service account permission issues
      };

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: existingBooking.eventId,
        resource: event
        // Remove sendUpdates to avoid service account permission issues
      });

      const meetingLink = response.data.conferenceData?.entryPoints?.[0]?.uri || existingBooking.meetingLink;
      
      return {
        meetingLink,
        eventId: response.data.id,
        joinUrl: meetingLink
      };

    } catch (error) {
      console.error('❌ Error updating Google Meet link:', error.message);
      return null;
    }
  }

  async deleteMeetingLink(eventId) {
    try {
      if (!this.calendar || !eventId) {
        return;
      }

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      console.log('✅ Google Calendar event deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting Google Calendar event:', error.message);
    }
  }
}

module.exports = new GoogleMeetService();
