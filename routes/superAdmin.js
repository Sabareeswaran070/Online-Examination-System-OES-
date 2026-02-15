const express = require('express');
const multer = require('multer');
const {
  getDashboard,
  createCollege,
  getAllColleges,
  getCollege,
  getCollegeStats,
  updateCollege,
  deleteCollege,
  toggleCollegeStatus,
  getAnalytics,
  getAuditLogs,
  createUser,
  assignCollegeAdmin,
  getAllUsers,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAllSubjects,
  bulkUploadQuestions,
  getQuestionSets,
  createQuestionSet,
  updateQuestionSet,
  deleteQuestionSet,
  bulkUploadUsers,
  createDepartmentForCollege,
  updateDepartmentForCollege,
  deleteDepartmentFromCollege,
  generateAICodingQuestion,
  lookupPincode,
} = require('../controllers/superAdminController');
const { protect } = require('../middleware/auth');
const { authorize, auditLog } = require('../middleware/rbac');
const {
  validate,
  createCollegeValidation,
  createQuestionValidation,
  validateObjectId,
} = require('../middleware/validation');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Protect all routes and authorize only super admin
router.use(protect);
router.use(authorize('superadmin'));

router.get('/dashboard', getDashboard);

router
  .route('/colleges')
  .get(auditLog('view', 'College'), getAllColleges)
  .post(
    createCollegeValidation,
    validate,
    auditLog('create', 'College'),
    createCollege
  );

router
  .route('/colleges/:id')
  .get(validateObjectId('id'), validate, getCollege)
  .put(
    validateObjectId('id'),
    validate,
    auditLog('update', 'College'),
    updateCollege
  )
  .delete(
    validateObjectId('id'),
    validate,
    auditLog('delete', 'College'),
    deleteCollege
  );

router.get(
  '/colleges/:id/stats',
  validateObjectId('id'),
  validate,
  getCollegeStats
);

router.put(
  '/colleges/:id/status',
  validateObjectId('id'),
  validate,
  auditLog('toggle-status', 'College'),
  toggleCollegeStatus
);

router.put(
  '/colleges/:id/assign-admin',
  validateObjectId('id'),
  validate,
  auditLog('assign-admin', 'College'),
  assignCollegeAdmin
);

router.post('/colleges/:id/departments', auditLog('create-department', 'Department'), createDepartmentForCollege);
router.put('/colleges/:id/departments/:deptId', auditLog('update-department', 'Department'), updateDepartmentForCollege);
router.delete('/colleges/:id/departments/:deptId', auditLog('delete-department', 'Department'), deleteDepartmentFromCollege);

// Pincode lookup
router.get('/pincode/:pincode', lookupPincode);

router.get('/analytics', getAnalytics);
router.get('/audit-logs', getAuditLogs);
router
  .route('/users')
  .get(getAllUsers)
  .post(auditLog('create', 'User'), createUser);

router.post('/users/bulk-upload', upload.single('file'), auditLog('bulk-upload', 'User'), bulkUploadUsers);

router
  .route('/users/:id')
  .put(validateObjectId('id'), validate, auditLog('update', 'User'), updateUser)
  .delete(
    validateObjectId('id'),
    validate,
    auditLog('delete', 'User'),
    deleteUser
  );

router.put(
  '/users/:id/status',
  validateObjectId('id'),
  validate,
  auditLog('toggle-status', 'User'),
  toggleUserStatus
);


// Question routes
router
  .route('/questions')
  .get(getQuestions)
  .post(createQuestionValidation, validate, auditLog('create', 'Question'), createQuestion);

// AI Question Generation (must be before /questions/:id to avoid route conflict)
router.post('/questions/generate-ai', auditLog('ai-generate', 'Question'), generateAICodingQuestion);

router
  .route('/questions/:id')
  .put(validateObjectId('id'), validate, auditLog('update', 'Question'), updateQuestion)
  .delete(validateObjectId('id'), validate, auditLog('delete', 'Question'), deleteQuestion);

router.post('/questions/bulk-upload', upload.single('file'), auditLog('bulk-upload', 'Question'), bulkUploadQuestions);


router.get('/subjects', getAllSubjects);

// Question Set (Folder) routes
router
  .route('/question-sets')
  .get(getQuestionSets)
  .post(auditLog('create-folder', 'QuestionSet'), createQuestionSet);

router
  .route('/question-sets/:id')
  .put(validateObjectId('id'), validate, auditLog('update-folder', 'QuestionSet'), updateQuestionSet)
  .delete(validateObjectId('id'), validate, auditLog('delete-folder', 'QuestionSet'), deleteQuestionSet);

module.exports = router;
