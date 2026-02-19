const express = require('express');
const {
  getGlobalLeaderboard,
  createCompetition,
  getCompetitionById,
  updateCompetition,
  deleteCompetition,
  getAllCompetitions,
  publishCompetition,
  approveCollegeForCompetition,
  approveAllAcceptedColleges,
  makeCompetitionLive,
  getCompetitionColleges,
  getCollegeCompetitions,
  respondToCompetition,
  getStudentCompetitions,
  getCompetitionLiveScores,
} = require('../controllers/competitionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

router.use(protect);

// Public / shared
router.get('/leaderboard', getGlobalLeaderboard);

// Student routes
router.get('/student/available', authorize('student'), getStudentCompetitions);

// College Admin routes
router.get('/college/my', authorize('admin'), getCollegeCompetitions);
router.put('/college/:competitionId/respond', authorize('admin'), respondToCompetition);

// Super Admin routes
router.get('/admin/all', authorize('superadmin'), getAllCompetitions);
router.post('/', authorize('superadmin'), createCompetition);
router.put('/:id/publish', authorize('superadmin'), publishCompetition);
router.put('/:id/live', authorize('superadmin'), makeCompetitionLive);
router.get('/:id/live-scores', authorize('superadmin'), getCompetitionLiveScores);
router.put('/:id/approve-all', authorize('superadmin'), approveAllAcceptedColleges);
router.get('/:id/colleges', authorize('superadmin'), getCompetitionColleges);
router.put(
  '/:id/colleges/:collegeId/approve',
  authorize('superadmin'),
  approveCollegeForCompetition
);

router
  .route('/:id')
  .get(getCompetitionById)
  .put(authorize('superadmin'), updateCompetition)
  .delete(authorize('superadmin'), deleteCompetition);

module.exports = router;
