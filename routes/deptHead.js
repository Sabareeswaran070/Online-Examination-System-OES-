const express = require('express');
const {
  getDashboard,
  getAnalytics,
  createSubject,
  getSubjects,
  updateSubject,
  assignSubjectToFaculty,
  unassignFacultyFromSubject,
  getFacultyWorkload,
  getStudents,
  getFaculty,
  createUser,
  updateUser,
  deleteUser,
  approveExam,
  deleteSubject,
  generateAIQuestions,
  getOngoingExams,
  getProctoringSettings,
  updateProctoringSettings,
} = require('../controllers/deptHeadController');
const { protect } = require('../middleware/auth');
const { authorize, auditLog, checkDepartmentOwnership } = require('../middleware/rbac');
const {
  validate,
  createSubjectValidation,
  validateObjectId,
} = require('../middleware/validation');

const router = express.Router();

// Protect all routes and authorize only department head
router.use(protect);
router.use(authorize('depthead'));

router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);

router
  .route('/subjects')
  .get(getSubjects)
  .post(
    createSubjectValidation,
    validate,
    auditLog('create', 'Subject'),
    createSubject
  );

router
  .route('/subjects/:id')
  .put(
    validateObjectId('id'),
    validate,
    auditLog('update', 'Subject'),
    updateSubject
  )
  .delete(
    validateObjectId('id'),
    validate,
    auditLog('delete', 'Subject'),
    deleteSubject
  );

router.post(
  '/subjects/assign',
  auditLog('assign-subject', 'Subject'),
  assignSubjectToFaculty
);

router.post(
  '/subjects/unassign',
  auditLog('unassign-subject', 'Subject'),
  unassignFacultyFromSubject
);

router.get('/faculty-workload', getFacultyWorkload);
router.get('/students', getStudents);
router.get('/faculty', getFaculty);

// User Management (Faculty & Students)
router.post('/users', auditLog('create', 'User'), createUser);
router.route('/users/:id')
  .put(validateObjectId('id'), validate, auditLog('update', 'User'), updateUser)
  .delete(validateObjectId('id'), validate, auditLog('delete', 'User'), deleteUser);

router.put(
  '/exams/:id/approve',
  validateObjectId('id'),
  validate,
  auditLog('approve', 'Exam'),
  approveExam
);

// AI Question Generation
router.post(
  '/questions/generate-ai',
  auditLog('ai-generate', 'Question'),
  generateAIQuestions
);

// Proctoring & Oversight
router.get('/proctoring/ongoing', getOngoingExams);
router.get('/proctoring/settings', getProctoringSettings);
router.put('/proctoring/settings', auditLog('update-settings', 'Department'), updateProctoringSettings);

module.exports = router;
