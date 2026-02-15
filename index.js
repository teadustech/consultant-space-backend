const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
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
mongoose
  .connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts')
  .then(() => {
    console.log("Connected to MongoDB");
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => console.error("MongoDB connection failed:", err));
