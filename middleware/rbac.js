const logger = require('../config/logger');
const AuditLog = require('../models/AuditLog');

// Role-based access control middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Unauthorized access attempt by user ${req.user._id} with role ${req.user.role}`
      );
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Check if user belongs to specific college
exports.checkCollegeAccess = (req, res, next) => {
  const { collegeId } = req.params;

  // Super admin can access all colleges
  if (req.user.role === 'superadmin') {
    return next();
  }

  // Check if user's college matches the requested college
  if (req.user.collegeId && req.user.collegeId.toString() !== collegeId) {
    logger.warn(
      `College access denied for user ${req.user._id} to college ${collegeId}`
    );
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this college',
    });
  }

  next();
};

// Check if user belongs to specific department
exports.checkDepartmentAccess = (req, res, next) => {
  const { departmentId } = req.params;

  // Super admin and college admin can access all departments
  if (req.user.role === 'superadmin' || req.user.role === 'admin') {
    return next();
  }

  // Check if user's department matches the requested department
  if (
    req.user.departmentId &&
    req.user.departmentId.toString() !== departmentId
  ) {
    logger.warn(
      `Department access denied for user ${req.user._id} to department ${departmentId}`
    );
    return res.status(403).json({
      success: false,
      message: 'You do not have access to this department',
    });
  }

  next();
};

// Log user actions for audit trail
exports.auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function to capture response
    res.send = function (data) {
      // Restore original send
      res.send = originalSend;

      // Create audit log entry
      const logEntry = {
        userId: req.user ? req.user._id : null,
        action,
        resource,
        resourceId: req.params.id || null,
        details: {
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          params: req.params,
          query: req.query,
        },
        ipAddress:
          req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: res.statusCode < 400 ? 'success' : 'failure',
      };

      // Save audit log (don't wait for it)
      AuditLog.create(logEntry).catch((err) => {
        logger.error('Error creating audit log:', err);
      });

      // Send response
      return originalSend.call(this, data);
    };

    next();
  };
};

// Check if college admin owns the college
exports.checkCollegeOwnership = async (req, res, next) => {
  const College = require('../models/College');
  const { collegeId, id } = req.params;
  const targetCollegeId = collegeId || id;

  try {
    const college = await College.findById(targetCollegeId);

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    // Super admin can access all
    if (req.user.role === 'superadmin') {
      return next();
    }

    // College admin must own the college
    if (
      req.user.role === 'admin' &&
      college.adminId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage this college',
      });
    }

    next();
  } catch (error) {
    logger.error('Error in checkCollegeOwnership:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Check if department head owns the department
exports.checkDepartmentOwnership = async (req, res, next) => {
  const Department = require('../models/Department');
  const { departmentId, id } = req.params;
  const targetDepartmentId = departmentId || id;

  try {
    const department = await Department.findById(targetDepartmentId);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Super admin and college admin can access all
    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Department head must own the department
    if (
      req.user.role === 'depthead' &&
      department.deptHeadId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage this department',
      });
    }

    next();
  } catch (error) {
    logger.error('Error in checkDepartmentOwnership:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
