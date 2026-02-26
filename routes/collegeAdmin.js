const express = require('express');
const multer = require('multer');
const {
  getDashboard,
  createDepartment,
  getDepartments,
  updateDepartment,
  assignDepartmentHead,
  bulkUploadStudents,
  getAnalytics,
  getLeaderboard,
  getStudents,
  getFaculty,
  deleteDepartment,
  createUser,
  updateUser,
  deleteUser,
  getDepartmentSubjects,
  createSubject,
  deleteSubject,
} = require('../controllers/collegeAdminController');
const { protect } = require('../middleware/auth');
const { authorize, auditLog } = require('../middleware/rbac');
const {
  validate,
  createDepartmentValidation,
  validateObjectId,
} = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Protect all routes and authorize only college admin
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);

router
  .route('/departments')
  .get(getDepartments)
  .post(
    createDepartmentValidation,
    validate,
    auditLog('create', 'Department'),
    createDepartment
  );

router
  .route('/departments/:id')
  .put(
    validateObjectId('id'),
    validate,
    auditLog('update', 'Department'),
    updateDepartment
  )
  .delete(
    validateObjectId('id'),
    validate,
    auditLog('delete', 'Department'),
    deleteDepartment
  );

router.get(
  '/departments/:id/subjects',
  validateObjectId('id'),
  validate,
  getDepartmentSubjects
);

router.post(
  '/subjects',
  auditLog('create', 'Subject'),
  createSubject
);

router.delete(
  '/subjects/:id',
  validateObjectId('id'),
  validate,
  auditLog('delete', 'Subject'),
  deleteSubject
);

router.put(
  '/departments/:id/assign-head',
  validateObjectId('id'),
  validate,
  auditLog('assign-head', 'Department'),
  assignDepartmentHead
);

router.post(
  '/students/bulk-upload',
  upload.single('file'),
  auditLog('bulk-upload', 'Student'),
  bulkUploadStudents
);

router.get('/analytics', getAnalytics);
router.get('/leaderboard', getLeaderboard);
router.get('/students', getStudents);
router.get('/faculty', getFaculty);

router
  .route('/users')
  .post(auditLog('create', 'User'), createUser);

router
  .route('/users/:id')
  .put(validateObjectId('id'), validate, auditLog('update', 'User'), updateUser)
  .delete(validateObjectId('id'), validate, auditLog('delete', 'User'), deleteUser);

module.exports = router;
