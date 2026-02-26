const express = require('express');
const {
  getDashboard,
  getAvailableExams,
  getExamDetails,
  startExam,
  submitExam,
  saveAnswer,
  getResults,
  getResultDetails,
  getLeaderboard,
  getAnalytics,
  runCode,
} = require('../controllers/studentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate, validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Protect all routes and authorize only students
router.use(protect);
router.use(authorize('student'));

router.get('/dashboard', getDashboard);

// Exam routes
router.get('/exams', getAvailableExams);
router.get(
  '/exams/:id',
  validateObjectId('id'),
  validate,
  getExamDetails
);

router.post(
  '/exams/:id/start',
  validateObjectId('id'),
  validate,
  startExam
);

router.post(
  '/exams/:id/submit',
  validateObjectId('id'),
  validate,
  submitExam
);

router.put(
  '/exams/:id/save-answer',
  validateObjectId('id'),
  validate,
  saveAnswer
);

// Results routes
router.get('/results', getResults);
router.get(
  '/results/:id',
  validateObjectId('id'),
  validate,
  getResultDetails
);

// Performance routes
router.get('/leaderboard', getLeaderboard);
router.get('/analytics', getAnalytics);

// Code execution
router.post('/run-code', runCode);

module.exports = router;
