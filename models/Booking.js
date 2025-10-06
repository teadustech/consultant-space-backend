const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Booking Details
  bookingId: {
    type: String,
    unique: true
  },
  
  // Participants
  consultant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultant',
    required: true
  },
  seeker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seeker',
    required: true
  },
  
  // Session Details
  sessionType: {
    type: String,
    required: true,
    enum: ['consultation', 'mentoring', 'review', 'coaching', 'other'],
    default: 'consultation'
  },
  
  sessionDuration: {
    type: Number,
    required: true,
    min: 15,
    max: 480, // 8 hours max
    default: 60 // 1 hour default
  },
  
  sessionDate: {
    type: Date,
    required: true
  },
  
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  
  endTime: {
    type: String,
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  
  // Location/Platform
  meetingPlatform: {
    type: String,
    required: true,
    enum: ['google_meet'],
    default: 'google_meet'
  },
  
  meetingLink: {
    type: String,
    trim: true
  },
  
  eventId: {
    type: String,
    trim: true
  },
  
  meetingLocation: {
    type: String,
    trim: true
  },
  
  // Description
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    default: 'pending'
  },
  
  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  
  paymentMethod: {
    type: String,
    enum: ['online', 'cash', 'bank_transfer', 'wallet'],
    default: 'online'
  },
  
  transactionId: {
    type: String,
    trim: true
  },
  
  // Commission
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  consultantAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Cancellation
  cancellationReason: {
    type: String,
    trim: true
  },
  
  cancelledBy: {
    type: String,
    enum: ['consultant', 'seeker', 'admin', 'system']
  },
  
  cancellationDate: {
    type: Date
  },
  
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Reviews
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  review: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  reviewDate: {
    type: Date
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Reminders
  reminderSent: {
    type: Boolean,
    default: false
  },
  
  reminderDate: {
    type: Date
  }
});

// Update the updatedAt field before saving
bookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate booking ID before saving
bookingSchema.pre('save', function(next) {
  if (!this.bookingId) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.bookingId = `BK${timestamp.slice(-8)}${random}`;
  }
  next();
});

// Calculate end time based on start time and duration
bookingSchema.pre('save', function(next) {
  if (this.startTime && this.sessionDuration && !this.endTime) {
    const [hours, minutes] = this.startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + this.sessionDuration * 60000);
    this.endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }
  next();
});

// Calculate amounts before saving
bookingSchema.pre('save', async function(next) {
  if (this.amount && this.amount > 0) {
    try {
      // Get consultant details to calculate commission
      if (this.consultant) {
        const Consultant = require('./Consultant');
        const consultant = await Consultant.findById(this.consultant);
        if (consultant) {
          // Use consultant-specific commission rate
          const commissionRate = consultant.commissionRate || 10;
          this.platformFee = Math.round((this.amount * commissionRate) / 100);
          this.consultantAmount = this.amount - this.platformFee;
        } else {
          // Fallback to default 10%
          this.platformFee = Math.round(this.amount * 0.1);
          this.consultantAmount = this.amount - this.platformFee;
        }
      } else {
        // Fallback to default 10%
        this.platformFee = Math.round(this.amount * 0.1);
        this.consultantAmount = this.amount - this.platformFee;
      }
    } catch (error) {
      console.error('Error calculating commission:', error);
      // Fallback to default 10%
      this.platformFee = Math.round(this.amount * 0.1);
      this.consultantAmount = this.amount - this.platformFee;
    }
  }
  next();
});

// Virtual for formatted date
bookingSchema.virtual('formattedDate').get(function() {
  return this.sessionDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted time
bookingSchema.virtual('formattedTime').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Virtual for total duration in hours
bookingSchema.virtual('durationHours').get(function() {
  return this.sessionDuration / 60;
});

// Instance methods
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  
  // Create session date time properly
  let sessionDateTime = new Date(this.sessionDate);
  
  // If the sessionDate doesn't have the time set (only date), set it from startTime
  if (sessionDateTime.getHours() === 0 && sessionDateTime.getMinutes() === 0) {
    const [hours, minutes] = this.startTime.split(':').map(Number);
    sessionDateTime.setHours(hours, minutes, 0, 0);
  }
  
  // Can cancel up to 24 hours before the session
  const cancellationDeadline = new Date(sessionDateTime.getTime() - 24 * 60 * 60 * 1000);
  
  console.log('Backend canBeCancelled check:', {
    bookingId: this._id,
    now: now.toISOString(),
    sessionDate: this.sessionDate,
    sessionDateTime: sessionDateTime.toISOString(),
    cancellationDeadline: cancellationDeadline.toISOString(),
    canCancel: now < cancellationDeadline
  });
  
  return now < cancellationDeadline;
};

bookingSchema.methods.calculateRefundAmount = function() {
  if (this.status === 'cancelled') {
    const now = new Date();
    const sessionDateTime = new Date(this.sessionDate);
    sessionDateTime.setHours(parseInt(this.startTime.split(':')[0]), parseInt(this.startTime.split(':')[1]));
    
    const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilSession > 24) {
      // Full refund if cancelled more than 24 hours before
      return this.amount;
    } else if (hoursUntilSession > 2) {
      // 50% refund if cancelled 2-24 hours before
      return this.amount * 0.5;
    } else {
      // No refund if cancelled less than 2 hours before
      return 0;
    }
  }
  return 0;
};

// Static methods
bookingSchema.statics.findByDateRange = function(startDate, endDate, consultantId = null) {
  const query = {
    sessionDate: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (consultantId) {
    query.consultant = consultantId;
  }
  
  return this.find(query).populate('consultant', 'fullName email').populate('seeker', 'fullName email');
};

bookingSchema.statics.findUpcoming = function(userId, userType, limit = 10) {
  const query = {
    sessionDate: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed'] }
  };
  
  if (userType === 'consultant') {
    query.consultant = userId;
  } else if (userType === 'seeker') {
    query.seeker = userId;
  }
  
  return this.find(query)
    .populate('consultant', 'fullName email profileImage')
    .populate('seeker', 'fullName email profileImage')
    .sort({ sessionDate: 1, startTime: 1 })
    .limit(limit);
};

// Create indexes for better performance
bookingSchema.index({ consultant: 1, sessionDate: 1 });
bookingSchema.index({ seeker: 1, sessionDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ sessionDate: 1, startTime: 1 });
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema); 