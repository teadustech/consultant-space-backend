const mongoose = require('mongoose');

const consultantSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true,
    enum: ['Software', 'Finance', 'Law', 'Admin', 'Marketing', 'HR', 'Other']
  },
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  expertise: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true
  },
  skills: {
    type: String,
    trim: true
  },
  education: {
    type: String,
    trim: true
  },
  certifications: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  
  // Availability and Schedule
  workingHours: {
    monday: { 
      start: { type: String, default: '09:00' }, 
      end: { type: String, default: '17:00' }, 
      available: { type: Boolean, default: true } 
    },
    tuesday: { 
      start: { type: String, default: '09:00' }, 
      end: { type: String, default: '17:00' }, 
      available: { type: Boolean, default: true } 
    },
    wednesday: { 
      start: { type: String, default: '09:00' }, 
      end: { type: String, default: '17:00' }, 
      available: { type: Boolean, default: true } 
    },
    thursday: { 
      start: { type: String, default: '09:00' }, 
      end: { type: String, default: '17:00' }, 
      available: { type: Boolean, default: true } 
    },
    friday: { 
      start: { type: String, default: '09:00' }, 
      end: { type: String, default: '17:00' }, 
      available: { type: Boolean, default: true } 
    },
    saturday: { 
      start: { type: String, default: '09:00' }, 
      end: { type: String, default: '17:00' }, 
      available: { type: Boolean, default: false } 
    },
    sunday: { 
      start: { type: String, default: '09:00' }, 
      end: { type: String, default: '17:00' }, 
      available: { type: Boolean, default: false } 
    }
  },
  
  // Booking Settings
  minBookingNotice: {
    type: Number,
    default: 2, // hours
    min: 0,
    max: 168 // 1 week
  },
  
  maxBookingAdvance: {
    type: Number,
    default: 30, // days
    min: 1,
    max: 365
  },
  
  sessionTypes: [{
    type: String,
    enum: ['consultation', 'mentoring', 'review', 'coaching', 'other']
  }],
  
  // Meeting Platforms
  meetingPlatforms: [{
    type: String,
    enum: ['google_meet'],
    default: ['google_meet']
  }],
  
  // Commission Settings
  commissionRate: {
    type: Number,
    default: 10, // Default 10% commission
    min: 0,
    max: 100,
    required: true
  },
  
  // Location for in-person meetings
  location: {
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    address: { type: String, trim: true }
  },
  
  profileImage: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Password Reset Fields
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  }
});

// Update the updatedAt field before saving
consultantSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better search performance
consultantSchema.index({ domain: 1, rating: -1 });
consultantSchema.index({ fullName: 'text', domain: 'text', expertise: 'text' });
consultantSchema.index({ hourlyRate: 1 });
consultantSchema.index({ experience: -1 });

module.exports = mongoose.model('Consultant', consultantSchema); 