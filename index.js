const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Validate required env before starting
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || typeof JWT_SECRET !== 'string' || JWT_SECRET.length < 16) {
  console.error('FATAL: JWT_SECRET must be set in .env and at least 16 characters long.');
  process.exit(1);
}

// Import security middleware
const { securityHeaders, customSecurityHeaders } = require('./middleware/securityHeaders');

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(customSecurityHeaders);

// CORS configuration with security
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://the-consultant-client.vercel.app'])
    : ['http://localhost:3000', 'http://localhost:8081'], // Added Expo dev server for mobile app
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware - preserve raw body for payment webhook signature verification
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (req.originalUrl === '/api/payments/webhook') {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const consultantRoutes = require('./routes/consultants');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');

app.use('/api/consultants', consultantRoutes);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "The Consultant API Server", 
    status: "running",
    version: "1.0.0",
    endpoints: {
      api: "/api",
      consultants: "/api/consultants",
      auth: "/api/auth",
      admin: "/api/admin",
      bookings: "/api/bookings",
      payments: "/api/payments"
    }
  });
});

// Basic API endpoint
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to the Live Consultant API" });
});

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts';
const isValidUri = mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://');
if (!isValidUri) {
  console.error('FATAL: Invalid MongoDB URI. It must start with mongodb:// or mongodb+srv://');
  console.error('Current value (first 50 chars):', mongoUri.substring(0, 50) + (mongoUri.length > 50 ? '...' : ''));
  console.error('Check MONGODB_URI or MONGO_URI in your .env file.');
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB");
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    console.error("Check your MONGODB_URI/MONGO_URI in .env (use mongodb:// or mongodb+srv://) and that MongoDB is reachable.");
    process.exit(1);
  });
