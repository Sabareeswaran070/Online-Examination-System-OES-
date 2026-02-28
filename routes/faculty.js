const express = require('express');
const {
  getDashboard,
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  addQuestionToExam,
  updateExamQuestionMarks,
  removeQuestionFromExam,
  removeAllQuestionsFromExam,
  publishExam,
  createQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  getExamResults,
  getPendingSubmissions,
  evaluateAnswer,
  evaluateAI,
  generateRandomQuestions,
} = require('../controllers/facultyController');
const { protect } = require('../middleware/auth');
const { authorize, auditLog } = require('../middleware/rbac');
const {
  validate,
  createExamValidation,
  createQuestionValidation,
  validateObjectId,
} = require('../middleware/validation');

const router = express.Router();

// Protect all routes and authorize faculty and superadmin
router.use(protect);
router.use(authorize('faculty', 'superadmin'));

router.get('/dashboard', getDashboard);

// Exam routes
router
  .route('/exams')
  .get(getExams)
  .post(
    createExamValidation,
    validate,
    auditLog('create', 'Exam'),
    createExam
  );

router
  .route('/exams/:id')
  .get(validateObjectId('id'), validate, getExam)
  .put(
    validateObjectId('id'),
    validate,
    auditLog('update', 'Exam'),
    updateExam
  )
  .delete(
    validateObjectId('id'),
    validate,
    auditLog('delete', 'Exam'),
    deleteExam
  );

router.post(
  '/exams/:id/questions',
  validateObjectId('id'),
  validate,
  addQuestionToExam
);

router.put(
  '/exams/:id/questions/:questionId/marks',
  validateObjectId('id'),
  validate,
  updateExamQuestionMarks
);

router.delete(
  '/exams/:id/questions/:questionId',
  validateObjectId('id'),
  validate,
  removeQuestionFromExam
);

router.delete(
  '/exams/:id/questions',
  validateObjectId('id'),
  validate,
  auditLog('removeAll', 'Exam'),
  removeAllQuestionsFromExam
);

router.post(
  '/exams/:id/publish',
  validateObjectId('id'),
  validate,
  auditLog('publish', 'Exam'),
  publishExam
);

router.post(
  '/exams/:id/generate-questions',
  validateObjectId('id'),
  validate,
  generateRandomQuestions
);

router.get(
  '/exams/:id/results',
  validateObjectId('id'),
  validate,
  getExamResults
);

// Question routes
router
  .route('/questions')
  .get(getQuestions)
  .post(
    createQuestionValidation,
    validate,
    auditLog('create', 'Question'),
    createQuestion
  );

router
  .route('/questions/:id')
  .put(
    validateObjectId('id'),
    validate,
    auditLog('update', 'Question'),
    updateQuestion
  )
  .delete(
    validateObjectId('id'),
    validate,
    auditLog('delete', 'Question'),
    deleteQuestion
  );

// Evaluation & Submissions
router.get('/submissions/pending', getPendingSubmissions);

router.post(
  '/evaluate/:resultId',
  validateObjectId('resultId'),
  validate,
  auditLog('evaluate', 'Result'),
  evaluateAnswer
);

router.post(
  '/evaluate/:resultId/ai',
  validateObjectId('resultId'),
  validate,
  auditLog('evaluateAI', 'Result'),
  evaluateAI
);

module.exports = router;
