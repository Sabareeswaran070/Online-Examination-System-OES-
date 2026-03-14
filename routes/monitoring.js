const express = require('express');
const {
    getExamMonitoringStats,
    getStudentActivityLog,
    getMonitoringReport
} = require('../controllers/monitoringController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin', 'admin', 'depthead', 'faculty'));

router.get('/exams/:id/stats', getExamMonitoringStats);
router.get('/exams/:examId/students/:studentId/log', getStudentActivityLog);
router.get('/exams/:id/report', getMonitoringReport);

module.exports = router;
