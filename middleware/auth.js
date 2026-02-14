const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

// Protect routes - Verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth Middleware - Token decoded:', decoded);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');
    console.log('Auth Middleware - User found:', req.user ? req.user._id : 'No user');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is active
    if (req.user.status !== 'active') {
      console.log('Auth Middleware - User inactive:', req.user._id);
      return res.status(401).json({
        success: false,
        message: 'Your account is inactive. Please contact administrator.',
      });
    }

    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// Generate JWT Token
exports.getSignedJwtToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Send token response
exports.sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = exports.getSignedJwtToken(user._id);

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    collegeId: user.collegeId,
    departmentId: user.departmentId,
    status: user.status,
  };

  res.status(statusCode).json({
    success: true,
    token,
    data: userData,
  });
};
