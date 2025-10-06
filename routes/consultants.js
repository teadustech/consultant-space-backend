const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Consultant = require('../models/Consultant');
const { publicSearchLimiter, authenticatedLimiter } = require('../middleware/rateLimiter');
const { sanitizeSearchParams, sanitizeConsultantData, validateSearchResults, handleValidationErrors } = require('../middleware/dataSanitizer');
const { authenticateToken, requireSeeker, requireConsultant } = require('../middleware/auth');

// Consultant Registration (alternative endpoint)
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, domain, experience, rate, password } = req.body;

    // Check if consultant already exists
    const existingConsultant = await Consultant.findOne({ email });
    if (existingConsultant) {
      return res.status(400).json({ message: 'Consultant with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new consultant
    const consultant = new Consultant({
      fullName,
      email,
      phone,
      domain,
      experience: parseInt(experience),
      hourlyRate: parseInt(rate),
      password: hashedPassword
    });

    await consultant.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: consultant._id, userType: 'consultant' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Consultant registered successfully',
      token,
      user: {
        id: consultant._id,
        fullName: consultant.fullName,
        email: consultant.email,
        domain: consultant.domain
      }
    });

  } catch (error) {
    console.error('Consultant registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Public search consultants (no authentication required)
router.get('/public/search', 
  publicSearchLimiter,
  sanitizeSearchParams,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        query, 
        domain, 
        minRating, 
        maxPrice, 
        minExperience, 
        maxExperience,
        page = 1,
        limit = 10
      } = req.query;
      
      // Build search criteria with security filters
      let searchCriteria = {
        isVerified: true,  // Only show verified consultants
        isAvailable: true  // Only show available consultants
      };
      
      if (domain) searchCriteria.domain = domain;
      if (minRating) searchCriteria.rating = { $gte: parseFloat(minRating) };
      if (maxPrice) searchCriteria.hourlyRate = { $lte: parseFloat(maxPrice) };
      if (minExperience) searchCriteria.experience = { $gte: parseInt(minExperience) };
      if (maxExperience) {
        searchCriteria.experience = { 
          ...searchCriteria.experience, 
          $lte: parseInt(maxExperience) 
        };
      }
      
      if (query) {
        searchCriteria.$or = [
          { fullName: { $regex: query, $options: 'i' } },
          { domain: { $regex: query, $options: 'i' } },
          { expertise: { $regex: query, $options: 'i' } }
        ];
      }
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Execute search with pagination
      const consultants = await Consultant.find(searchCriteria)
        .select('fullName domain experience hourlyRate rating totalReviews bio expertise isVerified isAvailable createdAt')
        .sort({ rating: -1, totalReviews: -1, experience: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      // Get total count for pagination
      const totalCount = await Consultant.countDocuments(searchCriteria);
      
      // Sanitize and validate results
      const sanitizedResults = validateSearchResults(consultants);
      
      res.json({
        consultants: sanitizedResults,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNextPage: skip + consultants.length < totalCount,
          hasPrevPage: parseInt(page) > 1
        }
      });
      
    } catch (error) {
      console.error('Public search error:', error);
      res.status(500).json({ 
        error: 'Search failed',
        message: 'Unable to search consultants at this time'
      });
    }
  }
);

// Authenticated search consultants (for logged-in users)
router.get('/search', 
  authenticateToken,
  requireSeeker,
  authenticatedLimiter,
  sanitizeSearchParams,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        query, 
        domain, 
        minRating, 
        maxPrice, 
        minExperience, 
        maxExperience,
        page = 1,
        limit = 20
      } = req.query;
      
      // Build search criteria with security filters
      let searchCriteria = {
        isVerified: true,  // Only show verified consultants
        isAvailable: true  // Only show available consultants
      };
      
      if (domain) searchCriteria.domain = domain;
      if (minRating) searchCriteria.rating = { $gte: parseFloat(minRating) };
      if (maxPrice) searchCriteria.hourlyRate = { $lte: parseFloat(maxPrice) };
      if (minExperience) searchCriteria.experience = { $gte: parseInt(minExperience) };
      if (maxExperience) {
        searchCriteria.experience = { 
          ...searchCriteria.experience, 
          $lte: parseInt(maxExperience) 
        };
      }
      
      if (query) {
        searchCriteria.$or = [
          { fullName: { $regex: query, $options: 'i' } },
          { domain: { $regex: query, $options: 'i' } },
          { expertise: { $regex: query, $options: 'i' } }
        ];
      }
      
      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const consultants = await Consultant.find(searchCriteria)
        .select('fullName domain experience hourlyRate rating totalReviews bio expertise isVerified isAvailable phone email createdAt')
        .sort({ rating: -1, totalReviews: -1, experience: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      const totalCount = await Consultant.countDocuments(searchCriteria);
      
      res.json({
        consultants,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNextPage: skip + consultants.length < totalCount,
          hasPrevPage: parseInt(page) > 1
        }
      });
      
    } catch (error) {
      console.error('Authenticated search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }
);

// Get available domains
router.get('/domains', async (req, res) => {
  try {
    const domains = await Consultant.distinct('domain');
    res.json(domains);
  } catch (error) {
    console.error('Domains error:', error);
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

// Public consultant profile (limited data)
router.get('/:id/public-profile', 
  publicSearchLimiter,
  async (req, res) => {
    try {
      const consultant = await Consultant.findById(req.params.id)
        .select('fullName domain experience hourlyRate rating totalReviews bio expertise skills isVerified isAvailable createdAt');
      
      if (!consultant) {
        return res.status(404).json({ message: 'Consultant not found' });
      }
      
      // Only show verified and available consultants publicly
      if (!consultant.isVerified || !consultant.isAvailable) {
        return res.status(404).json({ message: 'Consultant profile not available' });
      }
      
      // Sanitize the data
      const sanitizedProfile = sanitizeConsultantData(consultant);
      
      res.json(sanitizedProfile);
    } catch (error) {
      console.error('Public profile fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
);

// Authenticated consultant profile (limited data for seekers)
router.get('/:id/profile', 
  authenticateToken,
  authenticatedLimiter,
  async (req, res) => {
    try {
      const consultant = await Consultant.findById(req.params.id)
        .select('fullName domain experience hourlyRate rating totalReviews bio expertise skills isVerified isAvailable sessionTypes meetingPlatforms workingHours createdAt');
      
      if (!consultant) {
        return res.status(404).json({ error: 'Consultant not found' });
      }
      
      // Only show verified and available consultants
      if (!consultant.isVerified || !consultant.isAvailable) {
        return res.status(404).json({ error: 'Consultant profile not available' });
      }
      
      res.json(consultant);
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
);

// Get consultant's own profile (for editing)
router.get('/profile/me', 
  authenticateToken,
  requireConsultant,
  async (req, res) => {
    try {
      const consultant = await Consultant.findById(req.user.userId)
        .select('-password');
      
      if (!consultant) {
        return res.status(404).json({ error: 'Consultant not found' });
      }
      
      res.json(consultant);
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
);

// Get all consultants (for admin/database inspection)
router.get('/all', async (req, res) => {
  try {
    const consultants = await Consultant.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      count: consultants.length,
      consultants: consultants
    });
  } catch (error) {
    console.error('Get all consultants error:', error);
    res.status(500).json({ error: 'Failed to fetch consultants' });
  }
});

// Update consultant profile
router.put('/:id/profile', 
  authenticateToken,
  requireConsultant,
  async (req, res) => {
    try {
      // Verify the user is updating their own profile
      if (req.params.id !== req.user.userId) {
        return res.status(403).json({ error: 'You can only update your own profile' });
      }

      const { 
        fullName, 
        email, 
        phone, 
        domain, 
        experience, 
        hourlyRate, 
        expertise, 
        bio, 
        isAvailable,
        skills,
        education,
        certifications,
        workingHours,
        minBookingNotice,
        maxBookingAdvance
      } = req.body;
      
      const updateData = {};
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (domain) updateData.domain = domain;
      if (experience !== undefined) {
        // Handle experience as either number or string
        const expValue = typeof experience === 'string' ? experience : experience.toString();
        updateData.experience = expValue;
      }
      if (hourlyRate !== undefined) updateData.hourlyRate = parseInt(hourlyRate);
      if (expertise !== undefined) updateData.expertise = expertise;
      if (bio !== undefined) updateData.bio = bio;
      if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
      
      // Handle additional fields that might not be in the model yet
      if (skills !== undefined) updateData.skills = skills;
      if (education !== undefined) updateData.education = education;
      if (certifications !== undefined) updateData.certifications = certifications;
      
      // Handle availability and booking settings
      if (workingHours !== undefined) updateData.workingHours = workingHours;
      if (minBookingNotice !== undefined) updateData.minBookingNotice = minBookingNotice;
      if (maxBookingAdvance !== undefined) updateData.maxBookingAdvance = maxBookingAdvance;
      
      const consultant = await Consultant.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!consultant) {
        return res.status(404).json({ error: 'Consultant not found' });
      }
      
      res.json({
        message: 'Profile updated successfully',
        consultant
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Update consultant rates
router.put('/:id/rates', async (req, res) => {
  try {
    const { hourlyRate } = req.body;
    
    if (!hourlyRate || hourlyRate <= 0) {
      return res.status(400).json({ error: 'Valid hourly rate is required' });
    }
    
    const consultant = await Consultant.findByIdAndUpdate(
      req.params.id,
      { hourlyRate: parseInt(hourlyRate) },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }
    
    res.json({
      message: 'Rates updated successfully',
      consultant
    });
  } catch (error) {
    console.error('Rate update error:', error);
    res.status(500).json({ error: 'Failed to update rates' });
  }
});

module.exports = router; 