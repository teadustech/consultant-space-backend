const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const paymentService = require('../utils/paymentService');
const googleMeetService = require('../utils/googleMeetService');
const emailService = require('../utils/emailService');
const Booking = require('../models/Booking');
const Seeker = require('../models/Seeker');

// Payment routes are now enabled for Razorpay integration

// Validation middleware
const validatePaymentOrder = [
  body('bookingId').isMongoId().withMessage('Valid booking ID is required'),
];

const validatePaymentVerification = [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('signature').notEmpty().withMessage('Payment signature is required'),
];

const validateRefund = [
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('amount').isNumeric().withMessage('Valid amount is required'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
];

/**
 * @route   POST /api/payments/create-order
 * @desc    Create a new payment order for booking
 * @access  Private (Seekers only)
 */
router.post('/create-order', authenticateToken, validatePaymentOrder, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bookingId } = req.body;
    const seekerId = req.user.userId;

    // Check if user is a seeker
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can create payment orders' });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId)
      .populate('consultant', 'fullName email domain hourlyRate')
      .populate('seeker', 'fullName email phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking belongs to the seeker
    if (booking.seeker.toString() !== seekerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if booking is pending payment
    if (booking.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Payment already processed for this booking' });
    }

    // Get seeker details
    const seeker = await Seeker.findById(seekerId);
    if (!seeker) {
      return res.status(404).json({ message: 'Seeker not found' });
    }

    // Create payment order
    const order = await paymentService.createOrder(booking, seeker);

    // Update booking with order ID
    booking.transactionId = order.orderId;
    await booking.save();

    res.json({
      success: true,
      order,
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        amount: booking.amount,
        currency: booking.currency,
      },
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment and update booking status
 * @access  Private (Seekers only)
 */
router.post('/verify', authenticateToken, validatePaymentVerification, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, paymentId, signature } = req.body;
    const seekerId = req.user.userId;

    // Check if user is a seeker
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can verify payments' });
    }

    // Verify payment signature
    const isValidSignature = paymentService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValidSignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Get payment details from Razorpay
    const paymentDetails = await paymentService.getPaymentDetails(paymentId);

    // Find booking by order ID
    const booking = await Booking.findOne({ transactionId: orderId })
      .populate('consultant', 'fullName email domain')
      .populate('seeker', 'fullName email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking belongs to the seeker
    if (booking.seeker.toString() !== seekerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if payment amount matches booking amount
    const paymentAmount = paymentDetails.amount / 100; // Convert from paise
    if (paymentAmount !== booking.amount) {
      return res.status(400).json({ message: 'Payment amount mismatch' });
    }

    // Update booking with payment details
    booking.paymentStatus = 'paid';
    booking.transactionId = paymentId;
    booking.status = 'confirmed'; // Auto-confirm booking after payment
    await booking.save();

    // Generate Google Meet link after payment confirmation
    try {
      const meetingData = await googleMeetService.createMeetingLink({
        consultant: booking.consultant,
        seeker: booking.seeker,
        sessionType: booking.sessionType,
        sessionDuration: booking.sessionDuration,
        sessionDate: booking.sessionDate,
        startTime: booking.startTime,
        description: booking.description
      });

      if (meetingData) {
        booking.meetingLink = meetingData.meetingLink;
        booking.eventId = meetingData.eventId;
        await booking.save();
        
        // Send meeting confirmation email to seeker after payment
        try {
          await emailService.sendMeetingConfirmation({
            to: booking.seeker.email,
            consultantName: booking.consultant.fullName,
            seekerName: booking.seeker.fullName,
            meetingLink: meetingData.meetingLink,
            sessionDate: booking.sessionDate,
            startTime: booking.startTime,
            sessionDuration: booking.sessionDuration,
            sessionType: booking.sessionType
          });
          console.log('✅ Meeting confirmation email sent to seeker after payment');
        } catch (emailError) {
          console.error('❌ Failed to send meeting confirmation email:', emailError);
        }
      }
    } catch (error) {
      console.error('Failed to generate meeting link after payment:', error);
      // Continue even if meeting link generation fails
    }

    // Generate receipt
    const receipt = paymentService.generateReceipt(booking, paymentDetails);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: {
        paymentId: paymentDetails.paymentId,
        amount: paymentAmount,
        currency: paymentDetails.currency,
        method: paymentDetails.method,
        status: paymentDetails.status,
        paidAt: paymentDetails.capturedAt,
      },
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      },
      receipt,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
});

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Razorpay webhooks
 * @access  Public
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const webhookData = JSON.parse(req.body);
    const event = webhookData.event;

    console.log('Webhook received:', event);

    switch (event) {
      case 'payment.captured':
        await handlePaymentSuccess(webhookData);
        break;
      case 'payment.failed':
        await handlePaymentFailure(webhookData);
        break;
      case 'refund.processed':
        await handleRefundProcessed(webhookData);
        break;
      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

/**
 * @route   POST /api/payments/refund
 * @desc    Process refund for a booking
 * @access  Private (Admin/Consultant)
 */
router.post('/refund', authenticateToken, validateRefund, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId, amount, reason } = req.body;
    const userId = req.user.userId;
    const userType = req.user.userType;

    // Check if user is admin or consultant
    if (userType !== 'admin' && userType !== 'consultant') {
      return res.status(403).json({ message: 'Only admins and consultants can process refunds' });
    }

    // Process refund
    const refund = await paymentService.processRefund(paymentId, amount, reason);

    // Update booking status
    const booking = await Booking.findOne({ transactionId: paymentId });
    if (booking) {
      booking.paymentStatus = 'refunded';
      booking.refundAmount = amount;
      booking.cancellationReason = reason;
      booking.cancelledBy = userType;
      booking.cancellationDate = new Date();
      await booking.save();
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Failed to process refund' });
  }
});

/**
 * @route   GET /api/payments/methods
 * @desc    Get available payment methods
 * @access  Public
 */
router.get('/methods', async (req, res) => {
  try {
    // For now, return static payment methods
    // In the future, this could be fetched from Razorpay API
    const paymentMethods = [
      {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, MasterCard, RuPay, or American Express',
        icon: '💳',
        disabled: false,
      },
      {
        id: 'upi',
        name: 'UPI',
        description: 'Pay using UPI apps like Google Pay, PhonePe, Paytm',
        icon: '📱',
        disabled: false,
      },
      {
        id: 'netbanking',
        name: 'Net Banking',
        description: 'Pay using your bank account',
        icon: '🏦',
        disabled: false,
      },
      {
        id: 'wallet',
        name: 'Digital Wallet',
        description: 'Pay using Paytm, PhonePe, or other wallets',
        icon: '📱',
        disabled: false,
      },
    ];

    res.json({ paymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Failed to fetch payment methods' });
  }
});

/**
 * @route   GET /api/payments/breakdown/:bookingId
 * @desc    Get payment breakdown for a booking (seeker view - no platform fee)
 * @access  Private (Seekers only)
 */
router.get('/breakdown/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const seekerId = req.user.userId;

    // Check if user is a seeker
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can view payment breakdown' });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId)
      .populate('consultant', 'fullName email domain hourlyRate')
      .populate('seeker', 'fullName email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking belongs to the seeker
    if (booking.seeker.toString() !== seekerId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Calculate payment breakdown (internal calculation)
    const internalBreakdown = paymentService.calculatePaymentBreakdown(booking.amount, booking.consultant);

    // For seeker, only show consultation fee (no platform fee breakdown)
    const seekerBreakdown = {
      consultationFee: booking.amount,
      totalAmount: booking.amount,
      currency: booking.currency || 'INR',
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        sessionType: booking.sessionType,
        sessionDuration: booking.sessionDuration,
        sessionDate: booking.sessionDate,
        startTime: booking.startTime,
        consultant: {
          name: booking.consultant.fullName,
          domain: booking.consultant.domain,
        },
      },
    };

    res.json({
      success: true,
      breakdown: seekerBreakdown,
    });
  } catch (error) {
    console.error('Error fetching payment breakdown:', error);
    res.status(500).json({ message: 'Failed to fetch payment breakdown' });
  }
});

/**
 * @route   GET /api/payments/internal-breakdown/:bookingId
 * @desc    Get internal payment breakdown for admin/consultant (includes platform fee)
 * @access  Private (Admin/Consultant only)
 */
router.get('/internal-breakdown/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.userId;
    const userType = req.user.userType;

    // Check if user is admin or consultant
    if (userType !== 'admin' && userType !== 'consultant') {
      return res.status(403).json({ message: 'Only admins and consultants can view internal breakdown' });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId)
      .populate('consultant', 'fullName email domain hourlyRate commissionRate')
      .populate('seeker', 'fullName email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has access to this booking
    if (userType === 'consultant' && booking.consultant._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Calculate internal breakdown (includes platform fee)
    const internalBreakdown = paymentService.calculatePaymentBreakdown(booking.amount, booking.consultant);

    res.json({
      success: true,
      breakdown: {
        ...internalBreakdown,
        booking: {
          id: booking._id,
          bookingId: booking.bookingId,
          sessionType: booking.sessionType,
          sessionDuration: booking.sessionDuration,
          sessionDate: booking.sessionDate,
          startTime: booking.startTime,
          consultant: {
            name: booking.consultant.fullName,
            domain: booking.consultant.domain,
            commissionRate: booking.consultant.commissionRate,
          },
          seeker: {
            name: booking.seeker.fullName,
            email: booking.seeker.email,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching internal payment breakdown:', error);
    res.status(500).json({ message: 'Failed to fetch internal payment breakdown' });
  }
});

// Helper functions for webhook handling
async function handlePaymentSuccess(webhookData) {
  try {
    const paymentResult = await paymentService.processPaymentSuccess(webhookData);
    
    if (paymentResult.success) {
      const booking = await Booking.findOne({ bookingId: paymentResult.bookingId });
      if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        booking.transactionId = paymentResult.transactionId;
        await booking.save();
        
        console.log('Payment success processed for booking:', paymentResult.bookingId);
      }
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(webhookData) {
  try {
    const paymentResult = await paymentService.processPaymentFailure(webhookData);
    
    if (!paymentResult.success) {
      const booking = await Booking.findOne({ bookingId: paymentResult.bookingId });
      if (booking) {
        booking.paymentStatus = 'failed';
        await booking.save();
        
        console.log('Payment failure processed for booking:', paymentResult.bookingId);
      }
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleRefundProcessed(webhookData) {
  try {
    const refundData = webhookData.payload.refund.entity;
    const booking = await Booking.findOne({ transactionId: refundData.payment_id });
    
    if (booking) {
      booking.paymentStatus = 'refunded';
      booking.refundAmount = refundData.amount / 100; // Convert from paise
      await booking.save();
      
      console.log('Refund processed for booking:', booking.bookingId);
    }
  } catch (error) {
    console.error('Error handling refund processed:', error);
  }
}

module.exports = router;
