const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Consultant = require('../models/Consultant');
const Seeker = require('../models/Seeker');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const googleMeetService = require('../utils/googleMeetService');
const emailService = require('../utils/emailService');

// Validation middleware
const validateBooking = [
  body('consultantId').isMongoId().withMessage('Invalid consultant ID'),
  body('sessionType').isIn(['consultation', 'mentoring', 'review', 'coaching', 'other']).withMessage('Invalid session type'),
  body('sessionDuration').isInt({ min: 15, max: 480 }).withMessage('Session duration must be between 15 and 480 minutes'),
  body('sessionDate').isISO8601().withMessage('Invalid session date'),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('meetingPlatform').isIn(['google_meet']).withMessage('Invalid meeting platform'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long')
];

// Create a new booking
router.post('/', authenticateToken, validateBooking, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      consultantId,
      sessionType,
      sessionDuration,
      sessionDate,
      startTime,
      meetingPlatform,
      description
    } = req.body;

    const seekerId = req.user.userId;

    // Check if consultant exists and is available
    const consultant = await Consultant.findById(consultantId);
    if (!consultant) {
      return res.status(404).json({ message: 'Consultant not found' });
    }

    if (!consultant.isAvailable || !consultant.isVerified) {
      return res.status(400).json({ message: 'Consultant is not available for bookings' });
    }

    // Check if seeker exists
    const seeker = await Seeker.findById(seekerId);
    if (!seeker) {
      return res.status(404).json({ message: 'Seeker not found' });
    }

    // Validate session date and time
    // Parse the session date properly to handle timezone issues
    let bookingDate;
    
    if (sessionDate.includes('T')) {
      // If sessionDate is an ISO string (from frontend), parse it directly
      bookingDate = new Date(sessionDate);
    } else {
      // If sessionDate is just a date string (YYYY-MM-DD), create date with time
      const [year, month, day] = sessionDate.split('-');
      const [hour, minute] = startTime.split(':');
      
      // Create date in local timezone to avoid timezone shifts
      bookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    }
    
    // Ensure the bookingDate has the correct time set
    const [hour, minute] = startTime.split(':');
    bookingDate.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    const now = new Date();
    
    // Check if booking is in the past
    if (bookingDate < now) {
      return res.status(400).json({ message: 'Cannot book sessions in the past' });
    }

    // Check minimum booking notice
    const hoursUntilSession = (bookingDate - now) / (1000 * 60 * 60);
    if (hoursUntilSession < consultant.minBookingNotice) {
      return res.status(400).json({ 
        message: `Booking must be made at least ${consultant.minBookingNotice} hours in advance` 
      });
    }

    // Check maximum booking advance
    const daysUntilSession = hoursUntilSession / 24;
    if (daysUntilSession > consultant.maxBookingAdvance) {
      return res.status(400).json({ 
        message: `Cannot book more than ${consultant.maxBookingAdvance} days in advance` 
      });
    }

    // Check if consultant is available on this day and time
    const dayOfWeek = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const workingHours = consultant.workingHours[dayOfWeek];
    
    if (!workingHours.available) {
      return res.status(400).json({ message: 'Consultant is not available on this day' });
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [workStartHour, workStartMinute] = workingHours.start.split(':').map(Number);
    const [workEndHour, workEndMinute] = workingHours.end.split(':').map(Number);

    const bookingStartMinutes = startHour * 60 + startMinute;
    const workStartMinutes = workStartHour * 60 + workStartMinute;
    const workEndMinutes = workEndHour * 60 + workEndMinute;

    if (bookingStartMinutes < workStartMinutes || bookingStartMinutes >= workEndMinutes) {
      return res.status(400).json({ message: 'Booking time is outside consultant\'s working hours' });
    }

    // Check for time conflicts
    const endTime = new Date(bookingDate.getTime() + sessionDuration * 60000);
    const existingBookings = await Booking.find({
      consultant: consultantId,
      sessionDate: bookingDate,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          startTime: { $lt: endTime.toTimeString().slice(0, 5) },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({ message: 'Time slot is already booked' });
    }

    // Calculate amount
    const amount = Math.round((consultant.hourlyRate * sessionDuration) / 60);

    // Create booking with pending status for prepaid model
    const booking = new Booking({
      consultant: consultantId,
      seeker: seekerId,
      sessionType,
      sessionDuration,
      sessionDate: bookingDate,
      startTime,
      meetingPlatform,
      description,
      amount,
      status: 'pending', // Pending until payment is completed
      paymentStatus: 'pending' // Payment required before confirmation
    });

    await booking.save();

    // Note: Google Meet link and confirmation emails will be generated after payment is completed
    // This ensures prepaid model - no meeting details until payment is confirmed

    // Populate consultant and seeker details
    await booking.populate('consultant', 'fullName email profileImage');
    await booking.populate('seeker', 'fullName email profileImage');

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Failed to create booking' });
  }
});

// Get user's bookings (consultant or seeker)
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      sortBy = 'sessionDate',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user.userId;
    const userType = req.user.userType; // 'consultant' or 'seeker'

    // Build filter
    const filter = {};
    if (userType === 'consultant') {
      filter.consultant = userId;
    } else if (userType === 'seeker') {
      filter.seeker = userId;
    }

    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const bookings = await Booking.find(filter)
      .populate('consultant', 'fullName email profileImage')
      .populate('seeker', 'fullName email profileImage')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Booking.countDocuments(filter);

    res.json({
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNextPage: skip + bookings.length < totalCount,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get upcoming bookings
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const userId = req.user.userId;
    const userType = req.user.userType;

    const bookings = await Booking.findUpcoming(userId, userType, parseInt(limit));

    res.json({ bookings });

  } catch (error) {
    console.error('Get upcoming bookings error:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming bookings' });
  }
});

// Get booking by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('consultant', 'fullName email profileImage phone')
      .populate('seeker', 'fullName email profileImage phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has access to this booking
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType === 'consultant' && booking.consultant._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (userType === 'seeker' && booking.seeker._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ booking });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Failed to fetch booking' });
  }
});

// Update booking status (confirm, complete, cancel)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has permission to update this booking
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType === 'consultant' && booking.consultant.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (userType === 'seeker' && booking.seeker.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate status transition
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no_show'],
      completed: [],
      cancelled: [],
      no_show: [],
      rescheduled: ['confirmed', 'cancelled']
    };

    if (!validTransitions[booking.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot change status from ${booking.status} to ${status}` 
      });
    }

    // Handle cancellation
    if (status === 'cancelled') {
      if (!booking.canBeCancelled()) {
        return res.status(400).json({ 
          message: 'Cannot cancel booking less than 24 hours before session' 
        });
      }

      booking.cancelledBy = userType;
      booking.cancellationReason = reason;
      booking.cancellationDate = new Date();
      booking.refundAmount = booking.calculateRefundAmount();

      // Delete Google Calendar event if it exists
      if (booking.eventId) {
        try {
          await googleMeetService.deleteMeetingLink(booking.eventId);
          booking.eventId = null; // Clear the event ID
        } catch (error) {
          console.error('Failed to delete Google Calendar event:', error);
          // Continue with cancellation even if event deletion fails
        }
      }
    }

    // Handle completion
    if (status === 'completed') {
      booking.paymentStatus = 'paid';
    }

    // Generate or update Google Meet link when booking is confirmed
    if (status === 'confirmed' && !booking.meetingLink) {
      try {
        await booking.populate('consultant', 'fullName email profileImage');
        await booking.populate('seeker', 'fullName email profileImage');
        
        const meetingData = await googleMeetService.createMeetingLink({
          consultant: booking.consultant,
          seeker: booking.seeker,
          sessionType: booking.sessionType,
          sessionDuration: booking.sessionDuration,
          sessionDate: booking.sessionDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
          startTime: booking.startTime,
          description: booking.description
        });

        if (meetingData) {
          booking.meetingLink = meetingData.meetingLink;
          booking.eventId = meetingData.eventId;
          
          // Send meeting confirmation email to seeker
          try {
            await emailService.sendMeetingConfirmation({
              to: booking.seeker.email,
              consultantName: booking.consultant.fullName,
              seekerName: booking.seeker.fullName,
              meetingLink: meetingData.meetingLink,
              sessionDate: booking.sessionDate.toISOString().split('T')[0],
              startTime: booking.startTime,
              sessionDuration: booking.sessionDuration,
              sessionType: booking.sessionType
            });
            console.log('✅ Meeting confirmation email sent to seeker');
          } catch (emailError) {
            console.error('❌ Failed to send meeting confirmation email:', emailError);
            // Continue even if email fails
          }
        }
      } catch (error) {
        console.error('Failed to generate meeting link on confirmation:', error);
        // Continue without meeting link
      }
    }

    booking.status = status;
    await booking.save();

    // Populate details for response
    await booking.populate('consultant', 'fullName email profileImage');
    await booking.populate('seeker', 'fullName email profileImage');

    res.json({
      message: `Booking ${status} successfully`,
      booking
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Failed to update booking status' });
  }
});

// Add review to completed booking
router.post('/:id/review', authenticateToken, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isLength({ max: 500 }).withMessage('Review too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, review } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only seeker can add review
    if (req.user.userType !== 'seeker' || booking.seeker.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only seeker can add review' });
    }

    // Only completed bookings can be reviewed
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }

    // Check if already reviewed
    if (booking.rating) {
      return res.status(400).json({ message: 'Booking already reviewed' });
    }

    booking.rating = rating;
    booking.review = review;
    booking.reviewDate = new Date();
    await booking.save();

    // Update consultant's average rating
    const consultant = await Consultant.findById(booking.consultant);
    if (consultant) {
      const allBookings = await Booking.find({
        consultant: booking.consultant,
        rating: { $exists: true, $ne: null }
      });

      const totalRating = allBookings.reduce((sum, b) => sum + b.rating, 0);
      consultant.rating = totalRating / allBookings.length;
      consultant.totalReviews = allBookings.length;
      await consultant.save();
    }

    res.json({
      message: 'Review added successfully',
      booking
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Failed to add review' });
  }
});

// Get consultant's availability for a date range
router.get('/consultant/:consultantId/availability', async (req, res) => {
  try {
    const { consultantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const consultant = await Consultant.findById(consultantId);
    if (!consultant) {
      return res.status(404).json({ message: 'Consultant not found' });
    }

    // Get existing bookings in the date range
    const existingBookings = await Booking.findByDateRange(
      new Date(startDate),
      new Date(endDate),
      consultantId
    );

    // Generate availability slots
    const availability = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (currentDate <= endDateObj) {
      // Use consistent date formatting to avoid timezone issues
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const workingHours = consultant.workingHours[dayOfWeek];

      if (workingHours.available) {
        // Format date consistently to avoid timezone shifts
        const dateString = currentDate.toISOString().split('T')[0];
        const dayAvailability = {
          date: dateString,
          dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          workingHours: {
            start: workingHours.start,
            end: workingHours.end
          },
          availableSlots: [],
          bookedSlots: []
        };

        // Generate time slots
        const [startHour, startMinute] = workingHours.start.split(':').map(Number);
        const [endHour, endMinute] = workingHours.end.split(':').map(Number);
        
        let currentHour = startHour;
        let currentMinute = startMinute;

        while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
          const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          
          // Check if slot is booked using consistent date comparison
          const isBooked = existingBookings.some(booking => {
            // Format booking date consistently to avoid timezone issues
            const bookingDateString = booking.sessionDate.toISOString().split('T')[0];
            return bookingDateString === dateString && 
                   booking.startTime === timeSlot &&
                   ['pending', 'confirmed'].includes(booking.status);
          });

          if (isBooked) {
            dayAvailability.bookedSlots.push(timeSlot);
          } else {
            dayAvailability.availableSlots.push(timeSlot);
          }

          // Move to next slot (30-minute intervals)
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
          }
        }

        availability.push(dayAvailability);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({ availability });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ message: 'Failed to fetch availability' });
  }
});

// Reschedule booking
router.patch('/:id/reschedule', authenticateToken, [
  body('sessionDate').isISO8601().withMessage('Invalid session date'),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionDate, startTime } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has permission
    const userId = req.user.userId;
    const userType = req.user.userType;

    if (userType === 'consultant' && booking.consultant.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (userType === 'seeker' && booking.seeker.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only pending or confirmed bookings can be rescheduled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Cannot reschedule this booking' });
    }

    // Validate new date and time with proper timezone handling
    let newBookingDate;
    
    if (sessionDate.includes('T')) {
      // If sessionDate is an ISO string, parse it directly
      newBookingDate = new Date(sessionDate);
    } else {
      // If sessionDate is just a date string, create date with time
      const [year, month, day] = sessionDate.split('-');
      const [hour, minute] = startTime.split(':');
      
      // Create date in local timezone to avoid timezone shifts
      newBookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    }
    
    const now = new Date();

    if (newBookingDate < now) {
      return res.status(400).json({ message: 'Cannot reschedule to past date' });
    }

    // Check availability for new time slot
    const consultant = await Consultant.findById(booking.consultant);
    const dayOfWeek = newBookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const workingHours = consultant.workingHours[dayOfWeek];

    if (!workingHours.available) {
      return res.status(400).json({ message: 'Consultant is not available on this day' });
    }

    // Check for conflicts
    const endTime = new Date(newBookingDate.getTime() + booking.sessionDuration * 60000);
    const existingBookings = await Booking.find({
      consultant: booking.consultant,
      sessionDate: newBookingDate,
      status: { $in: ['pending', 'confirmed'] },
      _id: { $ne: bookingId },
      $or: [
        {
          startTime: { $lt: endTime.toTimeString().slice(0, 5) },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({ message: 'Time slot is already booked' });
    }

    // Update booking
    booking.sessionDate = newBookingDate;
    booking.startTime = startTime;
    booking.status = 'rescheduled';
    await booking.save();

    // Update Google Meet link if it exists
    if (booking.meetingLink && booking.eventId) {
      try {
        await booking.populate('consultant', 'fullName email profileImage');
        await booking.populate('seeker', 'fullName email profileImage');
        
        const meetingData = await googleMeetService.updateMeetingLink(bookingId, {
          consultant: booking.consultant,
          seeker: booking.seeker,
          sessionType: booking.sessionType,
          sessionDuration: booking.sessionDuration,
          sessionDate: sessionDate, // Use original date string
          startTime,
          description: booking.description
        });

        if (meetingData) {
          booking.meetingLink = meetingData.meetingLink;
          booking.eventId = meetingData.eventId;
          await booking.save();
        }
      } catch (error) {
        console.error('Failed to update meeting link on reschedule:', error);
        // Continue without updating meeting link
      }
    }

    // Populate details for response
    await booking.populate('consultant', 'fullName email profileImage');
    await booking.populate('seeker', 'fullName email profileImage');

    res.json({
      message: 'Booking rescheduled successfully',
      booking
    });

  } catch (error) {
    console.error('Reschedule booking error:', error);
    res.status(500).json({ message: 'Failed to reschedule booking' });
  }
});

module.exports = router; 