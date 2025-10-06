const { body, query, validationResult } = require('express-validator');

// Sanitize and validate search parameters
const sanitizeSearchParams = [
  query('query')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape(),
  
  query('domain')
    .optional()
    .trim()
    .isIn(['Software', 'Finance', 'Law', 'Admin', 'Marketing', 'HR', 'Other'])
    .withMessage('Invalid domain selection'),
  
  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  
  query('maxPrice')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Price must be between 0 and 10000'),
  
  query('minExperience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  
  query('maxExperience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  
  query('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be between 1 and 100'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Sanitize consultant profile data for public display
const sanitizeConsultantData = (consultant) => {
  const sanitized = {
    _id: consultant._id,
    fullName: consultant.fullName,
    domain: consultant.domain,
    experience: consultant.experience,
    hourlyRate: consultant.hourlyRate,
    rating: consultant.rating || 0,
    totalReviews: consultant.totalReviews || 0,
    isVerified: consultant.isVerified,
    isAvailable: consultant.isAvailable,
    createdAt: consultant.createdAt
  };

  // Only include bio if consultant is verified
  if (consultant.isVerified && consultant.bio) {
    sanitized.bio = consultant.bio.substring(0, 200); // Limit bio length
  }

  // Only include expertise if consultant is verified
  if (consultant.isVerified && consultant.expertise) {
    sanitized.expertise = consultant.expertise;
  }

  return sanitized;
};

// Validate search results before sending
const validateSearchResults = (results) => {
  if (!Array.isArray(results)) {
    throw new Error('Search results must be an array');
  }

  return results.map(consultant => {
    if (!consultant._id || !consultant.fullName) {
      throw new Error('Invalid consultant data structure');
    }
    return sanitizeConsultantData(consultant);
  });
};

// Check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid search parameters',
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  sanitizeSearchParams,
  sanitizeConsultantData,
  validateSearchResults,
  handleValidationErrors
}; 