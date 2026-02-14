const express = require('express');
const {
  getDashboard,
  getAnalytics,
  createSubject,
  getSubjects,
  updateSubject,
  assignSubjectToFaculty,
  getFacultyWorkload,
  getStudents,
  getFaculty,
  approveExam,
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

router.put(
  '/subjects/:id',
  validateObjectId('id'),
  validate,
  auditLog('update', 'Subject'),
  updateSubject
);

router.post(
  '/subjects/assign',
  auditLog('assign-subject', 'Subject'),
  assignSubjectToFaculty
);

router.get('/faculty-workload', getFacultyWorkload);
router.get('/students', getStudents);
router.get('/faculty', getFaculty);

router.put(
  '/exams/:id/approve',
  validateObjectId('id'),
  validate,
  auditLog('approve', 'Exam'),
  approveExam
);

module.exports = router;
