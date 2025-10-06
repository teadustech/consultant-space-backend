const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check if user is a consultant
const requireConsultant = (req, res, next) => {
  if (req.user.userType !== 'consultant') {
    return res.status(403).json({ message: 'Consultant access required' });
  }
  next();
};

// Middleware to check if user is a seeker
const requireSeeker = (req, res, next) => {
  if (req.user.userType !== 'seeker') {
    return res.status(403).json({ message: 'Seeker access required' });
  }
  next();
};

// Middleware to check if user is either consultant or seeker
const requireAnyUser = (req, res, next) => {
  if (!['consultant', 'seeker'].includes(req.user.userType)) {
    return res.status(403).json({ message: 'Authentication required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireConsultant,
  requireSeeker,
  requireAnyUser
};