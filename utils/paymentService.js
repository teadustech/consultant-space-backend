const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  /**
   * Create a new payment order
   * @param {Object} booking - Booking object
   * @param {Object} user - User object (seeker)
   * @returns {Object} Order details
   */
  async createOrder(booking, user) {
    try {
      const orderData = {
        amount: booking.amount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: booking.bookingId,
        notes: {
          bookingId: booking.bookingId,
          consultantId: booking.consultant.toString(),
          seekerId: booking.seeker.toString(),
          sessionType: booking.sessionType,
          sessionDuration: booking.sessionDuration.toString(),
          sessionDate: booking.sessionDate.toISOString(),
          startTime: booking.startTime,
        },
        prefill: {
          name: user.fullName,
          email: user.email,
          contact: user.phone || '',
        },
        theme: {
          color: '#10B981', // Brand teal color
        },
      };

      const order = await razorpay.orders.create(orderData);
      
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        createdAt: order.created_at,
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error('Failed to create payment order');
    }
  }

  /**
   * Verify payment signature
   * @param {string} orderId - Razorpay order ID
   * @param {string} paymentId - Razorpay payment ID
   * @param {string} signature - Payment signature
   * @returns {boolean} Verification result
   */
  verifyPaymentSignature(orderId, paymentId, signature) {
    try {
      const text = `${orderId}|${paymentId}`;
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

      return generatedSignature === signature;
    } catch (error) {
      console.error('Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Fetch payment details from Razorpay
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Object} Payment details
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      
      return {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        capturedAt: payment.captured_at,
        description: payment.description,
        email: payment.email,
        contact: payment.contact,
        notes: payment.notes,
      };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw new Error('Failed to fetch payment details');
    }
  }

  /**
   * Process payment success
   * @param {Object} paymentData - Payment data from webhook
   * @returns {Object} Processed payment data
   */
  async processPaymentSuccess(paymentData) {
    try {
      const payment = await this.getPaymentDetails(paymentData.payload.payment.entity.id);
      
      // Verify signature
      const isValidSignature = this.verifyPaymentSignature(
        payment.orderId,
        payment.paymentId,
        paymentData.payload.payment.entity.signature
      );

      if (!isValidSignature) {
        throw new Error('Invalid payment signature');
      }

      return {
        success: true,
        payment,
        bookingId: paymentData.payload.payment.entity.notes?.bookingId,
        orderId: payment.orderId,
        amount: payment.amount / 100, // Convert from paise to rupees
        status: payment.status,
        method: payment.method,
        transactionId: payment.paymentId,
      };
    } catch (error) {
      console.error('Error processing payment success:', error);
      throw error;
    }
  }

  /**
   * Process payment failure
   * @param {Object} paymentData - Payment data from webhook
   * @returns {Object} Processed failure data
   */
  async processPaymentFailure(paymentData) {
    try {
      const payment = await this.getPaymentDetails(paymentData.payload.payment.entity.id);
      
      return {
        success: false,
        payment,
        bookingId: paymentData.payload.payment.entity.notes?.bookingId,
        orderId: payment.orderId,
        amount: payment.amount / 100,
        status: payment.status,
        errorCode: payment.error_code,
        errorDescription: payment.error_description,
        transactionId: payment.paymentId,
      };
    } catch (error) {
      console.error('Error processing payment failure:', error);
      throw error;
    }
  }

  /**
   * Process refund
   * @param {string} paymentId - Payment ID to refund
   * @param {number} amount - Amount to refund (in paise)
   * @param {string} reason - Refund reason
   * @returns {Object} Refund details
   */
  async processRefund(paymentId, amount, reason) {
    try {
      const refundData = {
        amount: amount,
        speed: 'normal',
        notes: {
          reason: reason,
        },
      };

      const refund = await razorpay.payments.refund(paymentId, refundData);
      
      return {
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        speed: refund.speed,
        processedAt: refund.processed_at,
        notes: refund.notes,
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error('Failed to process refund');
    }
  }

  /**
   * Get payment methods available
   * @returns {Array} Available payment methods
   */
  getAvailablePaymentMethods() {
    return [
      {
        method: 'upi',
        name: 'UPI',
        description: 'Pay using UPI apps like Google Pay, PhonePe, Paytm',
        icon: '💳',
        enabled: true,
      },
      {
        method: 'card',
        name: 'Credit/Debit Card',
        description: 'Pay using Visa, MasterCard, RuPay cards',
        icon: '💳',
        enabled: true,
      },
      {
        method: 'netbanking',
        name: 'Net Banking',
        description: 'Pay using your bank account',
        icon: '🏦',
        enabled: true,
      },
      {
        method: 'wallet',
        name: 'Digital Wallet',
        description: 'Pay using Paytm, PhonePe, Amazon Pay wallets',
        icon: '📱',
        enabled: true,
      },
    ];
  }

  /**
   * Calculate payment breakdown
   * @param {number} baseAmount - Base session amount
   * @param {Object} consultant - Consultant object with commission rate
   * @returns {Object} Payment breakdown
   */
  calculatePaymentBreakdown(baseAmount, consultant = null) {
    // Use consultant-specific commission rate, default to 10%
    const commissionRate = consultant?.commissionRate || 10;
    const platformFee = (baseAmount * commissionRate) / 100;
    const consultantAmount = baseAmount - platformFee;

    return {
      baseAmount,
      platformFee,
      consultantAmount,
      totalAmount: baseAmount,
      commissionRate
    };
  }

  /**
   * Generate payment receipt
   * @param {Object} booking - Booking object
   * @param {Object} payment - Payment details
   * @returns {Object} Receipt data
   */
  generateReceipt(booking, payment) {
    const receiptNumber = `REC-${Date.now()}`;
    
    // Use consultant-specific commission rate
    const commissionRate = booking.consultant?.commissionRate || 10;
    const platformFee = (booking.amount * commissionRate) / 100;
    const consultantAmount = booking.amount - platformFee;

    return {
      receiptNumber,
      bookingId: booking.bookingId,
      consultantName: booking.consultant?.fullName || 'Consultant',
      seekerName: booking.seeker?.fullName || 'Seeker',
      sessionDate: booking.sessionDate,
      sessionTime: booking.startTime,
      sessionDuration: booking.sessionDuration,
      sessionType: booking.sessionType,
      amount: booking.amount,
      currency: booking.currency,
      platformFee,
      consultantAmount,
      commissionRate,
      paymentMethod: payment?.method || 'online',
      transactionId: payment?.paymentId || booking.transactionId,
      paymentDate: payment?.capturedAt ? new Date(payment.capturedAt * 1000) : new Date(),
      status: payment?.status || 'pending',
    };
  }
}

module.exports = new PaymentService();
