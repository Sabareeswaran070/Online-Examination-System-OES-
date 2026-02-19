const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));

    // Log to file for debugging
    const logger = require('../config/logger');
    logger.warn('Validation failed:', {
      url: req.originalUrl,
      method: req.method,
      errors: errorDetails
    });

    return res.status(400).json({
      success: false,
      errors: errorDetails,
    });
  }
  next();
};

// User registration validation
exports.registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['superadmin', 'admin', 'depthead', 'faculty', 'student'])
    .withMessage('Invalid role'),
];

// Login validation
exports.loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// College creation validation
exports.createCollegeValidation = [
  body('collegeName').trim().notEmpty().withMessage('College name is required'),
  body('collegeCode')
    .trim()
    .notEmpty()
    .withMessage('College code is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('College code must be 2-10 characters'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.state').trim().notEmpty().withMessage('State is required'),
];

// Department creation validation
exports.createDepartmentValidation = [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('departmentCode')
    .trim()
    .notEmpty()
    .withMessage('Department code is required'),
  body('collegeId').notEmpty().withMessage('College ID is required'),
];

// Exam creation validation
exports.createExamValidation = [
  body('title').trim().notEmpty().withMessage('Exam title is required'),
  body('subject')
    .custom((value) => {
      if (!value || value === '') return true;
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid subject ID');
      }
      return true;
    }),
  body('departmentId')
    .custom((value) => {
      if (!value || value === '') return true;
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid department ID');
      }
      return true;
    }),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('duration')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive number'),
  body('totalMarks')
    .isFloat({ min: 1 })
    .withMessage('Total marks must be a positive number'),
  body('passingMarks')
    .isFloat({ min: 0 })
    .withMessage('Passing marks must be a non-negative number'),
];

// Question creation validation
exports.createQuestionValidation = [
  body('questionText')
    .trim()
    .notEmpty()
    .withMessage('Question text is required'),
  body('type')
    .isIn(['MCQ', 'Descriptive', 'TrueFalse', 'Coding'])
    .withMessage('Invalid question type'),
  body('marks')
    .isFloat({ min: 0 })
    .withMessage('Marks must be a positive number'),
];

// Subject creation validation
exports.createSubjectValidation = [
  body('name').trim().notEmpty().withMessage('Subject name is required'),
  body('subjectCode').trim().notEmpty().withMessage('Subject code is required'),
  body('departmentId').notEmpty().withMessage('Department ID is required'),
  body('collegeId').notEmpty().withMessage('College ID is required'),
];

// MongoDB ObjectId validation
exports.validateObjectId = (paramName) => {
  return param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`);
};
