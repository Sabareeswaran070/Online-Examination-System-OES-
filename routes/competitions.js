const express = require('express');
const {
    getGlobalLeaderboard,
    createCompetition,
    getActiveCompetitions,
    getCompetitionById,
    updateCompetition,
    deleteCompetition,
    getAllCompetitions,
} = require('../controllers/competitionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

router.use(protect);

router.get('/leaderboard', getGlobalLeaderboard);
router.get('/admin/all', authorize('superadmin'), getAllCompetitions);
router.get('/', getActiveCompetitions);
router.post('/', authorize('superadmin'), createCompetition);

router
    .route('/:id')
    .get(getCompetitionById)
    .put(authorize('superadmin'), updateCompetition)
    .delete(authorize('superadmin'), deleteCompetition);

module.exports = router;
