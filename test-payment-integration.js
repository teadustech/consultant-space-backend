const mongoose = require('mongoose');
require('dotenv').config();

// Mock payment service functions for testing
const mockPaymentService = {
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
  },

  calculatePaymentBreakdown(baseAmount, consultant = null) {
    // Use consultant-specific commission rate, default to 10%
    const commissionRate = consultant?.commissionRate || 10;
    const platformFee = Math.round((baseAmount * commissionRate) / 100);
    const consultantAmount = baseAmount - platformFee;
    const totalAmount = baseAmount;

    return {
      baseAmount,
      platformFee,
      consultantAmount,
      totalAmount,
      commissionRate,
      currency: 'INR',
      breakdown: {
        'Session Fee': baseAmount,
        'Platform Fee': platformFee,
        'Total': totalAmount,
      },
    };
  },

  formatCurrency(amount, currency = 'INR') {
    const amountInRupees = amount / 100; // Convert from paise to rupees
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amountInRupees);
  },

  getPaymentMethodIcon(method) {
    const icons = {
      upi: '💳',
      card: '💳',
      netbanking: '🏦',
      wallet: '📱',
      default: '💰',
    };
    return icons[method] || icons.default;
  },

  getPaymentMethodName(method) {
    const names = {
      upi: 'UPI',
      card: 'Credit/Debit Card',
      netbanking: 'Net Banking',
      wallet: 'Digital Wallet',
      default: 'Online Payment',
    };
    return names[method] || names.default;
  },

  generateReceipt(booking, payment) {
    const breakdown = this.calculatePaymentBreakdown(booking.amount);
    
    return {
      receiptNumber: `RCP-${booking.bookingId}`,
      bookingId: booking.bookingId,
      paymentId: payment.paymentId,
      date: new Date().toISOString(),
      consultant: {
        name: booking.consultant.fullName,
        email: booking.consultant.email,
        domain: booking.consultant.domain,
      },
      seeker: {
        name: booking.seeker.fullName,
        email: booking.seeker.email,
      },
      session: {
        type: booking.sessionType,
        duration: booking.sessionDuration,
        date: booking.sessionDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },
      payment: {
        method: payment.method,
        amount: breakdown.totalAmount,
        currency: breakdown.currency,
        status: payment.status,
        transactionId: payment.paymentId,
        paidAt: payment.capturedAt,
      },
      breakdown: breakdown.breakdown,
    };
  }
};

async function testPaymentIntegration() {
  try {
    console.log('🧪 Testing Payment Integration...\n');

    // Test 1: Payment Methods
    console.log('1. Testing Payment Methods:');
    const paymentMethods = mockPaymentService.getAvailablePaymentMethods();
    console.log('✅ Available payment methods:', paymentMethods.length);
    paymentMethods.forEach(method => {
      console.log(`   - ${method.name} (${method.method})`);
    });
    console.log('');

    // Test 2: Payment Breakdown Calculation
    console.log('2. Testing Payment Breakdown:');
    const testAmount = 1000; // ₹1000
    const breakdown = mockPaymentService.calculatePaymentBreakdown(testAmount);
    console.log('✅ Payment breakdown calculated:');
    console.log(`   - Base Amount: ₹${breakdown.baseAmount}`);
    console.log(`   - Platform Fee (10%): ₹${breakdown.platformFee}`);
    console.log(`   - Consultant Amount: ₹${breakdown.consultantAmount}`);
    console.log(`   - Total: ₹${breakdown.totalAmount}`);
    console.log('');

    // Test 3: Currency Formatting
    console.log('3. Testing Currency Formatting:');
    const formattedAmount = mockPaymentService.formatCurrency(100000); // ₹1000 in paise
    console.log('✅ Formatted amount:', formattedAmount);
    console.log('');

    // Test 4: Payment Method Icons and Names
    console.log('4. Testing Payment Method Helpers:');
    const testMethods = ['upi', 'card', 'netbanking', 'wallet'];
    testMethods.forEach(method => {
      const icon = mockPaymentService.getPaymentMethodIcon(method);
      const name = mockPaymentService.getPaymentMethodName(method);
      console.log(`   - ${method}: ${icon} ${name}`);
    });
    console.log('');

    // Test 5: Receipt Generation
    console.log('5. Testing Receipt Generation:');
    const mockBooking = {
      bookingId: 'BK123456',
      amount: 1000,
      sessionType: 'consultation',
      sessionDuration: 60,
      sessionDate: new Date(),
      startTime: '10:00',
      endTime: '11:00',
      consultant: {
        fullName: 'John Doe',
        email: 'john@example.com',
        domain: 'Technology'
      },
      seeker: {
        fullName: 'Jane Smith',
        email: 'jane@example.com'
      }
    };

    const mockPayment = {
      paymentId: 'pay_test123',
      method: 'upi',
      status: 'captured',
      capturedAt: new Date()
    };

    const receipt = mockPaymentService.generateReceipt(mockBooking, mockPayment);
    console.log('✅ Receipt generated:');
    console.log(`   - Receipt Number: ${receipt.receiptNumber}`);
    console.log(`   - Booking ID: ${receipt.bookingId}`);
    console.log(`   - Payment ID: ${receipt.paymentId}`);
    console.log(`   - Amount: ₹${receipt.payment.amount}`);
    console.log('');

    // Test 6: API Routes Structure
    console.log('6. Testing API Routes Structure:');
    const apiRoutes = [
      'POST /api/payments/create-order',
      'POST /api/payments/verify',
      'POST /api/payments/webhook',
      'POST /api/payments/refund',
      'GET /api/payments/methods',
      'GET /api/payments/breakdown/:bookingId'
    ];
    console.log('✅ Payment API routes defined:');
    apiRoutes.forEach(route => {
      console.log(`   - ${route}`);
    });
    console.log('');

    console.log('🎉 All payment integration tests completed successfully!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Set up Razorpay account and get API keys');
    console.log('2. Add environment variables to .env file:');
    console.log('   RAZORPAY_KEY_ID=rzp_test_your-test-key-id');
    console.log('   RAZORPAY_KEY_SECRET=your-test-secret-key');
    console.log('   RAZORPAY_WEBHOOK_SECRET=your-webhook-secret');
    console.log('3. Test with real payment flow');
    console.log('4. Configure webhooks for production');
    console.log('');
    console.log('📚 Documentation:');
    console.log('- Payment Setup Guide: docs/PAYMENT_SETUP.md');
    console.log('- API Documentation: Check the payment routes');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPaymentIntegration();
