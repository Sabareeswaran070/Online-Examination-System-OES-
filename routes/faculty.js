const express = require('express');
const {
  getDashboard,
  getSubjects,
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
  publishResults,
  getPendingSubmissions,
  evaluateAnswer,
  evaluateAI,
  generateRandomQuestions,
  delegateEvaluation,
  generateAIQuestions,
  getProctoringDefaults,
  handleUnlockRequest,
  bulkDeleteExams,
  bulkDeleteQuestions,
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

// Protect all routes and authorize faculty, superadmin, admin, and depthead
router.use(protect);
router.use(authorize('faculty', 'superadmin', 'admin', 'depthead'));

router.get('/dashboard', getDashboard);
router.get('/subjects', getSubjects);
router.get('/proctoring-defaults', getProctoringDefaults);

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

router.post('/exams/bulk-delete', auditLog('bulkDelete', 'Exam'), bulkDeleteExams);

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

router.put(
  '/exams/:id/delegate',
  validateObjectId('id'),
  validate,
  delegateEvaluation
);

router.get(
  '/exams/:id/results',
  validateObjectId('id'),
  validate,
  getExamResults
);

router.post(
  '/exams/:id/publish-results',
  validateObjectId('id'),
  validate,
  auditLog('publishResults', 'Exam'),
  publishResults
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

router.post('/questions/bulk-delete', auditLog('bulkDelete', 'Question'), bulkDeleteQuestions);

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

// AI Question Generation
router.post(
  '/questions/generate-ai',
  auditLog('ai-generate', 'Question'),
  generateAIQuestions
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

router.post(
  '/results/:id/unlock',
  validateObjectId('id'),
  validate,
  auditLog('unlock', 'Result'),
  handleUnlockRequest
);

module.exports = router;
