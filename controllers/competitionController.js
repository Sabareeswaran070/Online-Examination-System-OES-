const Exam = require('../models/Exam');
const Result = require('../models/Result');
const User = require('../models/User');
const logger = require('../config/logger');

// @desc    Get global leaderboard
// @route   GET /api/competitions/leaderboard
// @access  Public (or Private based on requirements, let's say Private/Student/Admin)
exports.getGlobalLeaderboard = async (req, res, next) => {
    try {
        const { limit = 100, examType } = req.query;

        const pipeline = [];

        // Filter by exam type if provided (e.g., 'competition')
        if (examType) {
            pipeline.push({
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            });
            pipeline.push({ $unwind: '$exam' });
            pipeline.push({ $match: { 'exam.examType': examType } });
        }

        pipeline.push(
            {
                $group: {
                    _id: '$studentId',
                    totalScore: { $sum: '$score' },
                    avgPercentage: { $avg: '$percentage' },
                    totalExams: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student',
                },
            },
            { $unwind: '$student' },
            // Lookup college for the student
            {
                $lookup: {
                    from: 'colleges',
                    localField: 'student.collegeId',
                    foreignField: '_id',
                    as: 'college'
                }
            },
            { $unwind: { path: '$college', preserveNullAndEmptyArrays: true } },
            { $sort: { avgPercentage: -1 } },
            { $limit: parseInt(limit) },
            {
                $project: {
                    studentName: '$student.name',
                    collegeName: '$college.collegeName',
                    totalScore: 1,
                    avgPercentage: 1,
                    totalExams: 1,
                },
            }
        );

        const leaderboard = await Result.aggregate(pipeline);

        res.status(200).json({
            success: true,
            count: leaderboard.length,
            data: leaderboard,
        });
    } catch (error) {
        logger.error('Get global leaderboard error:', error);
        next(error);
    }
};

// @desc    Create a global competition (Super Admin)
// @route   POST /api/competitions
// @access  Private/SuperAdmin
exports.createCompetition = async (req, res, next) => {
    try {
        const competitionData = {
            ...req.body,
            examType: 'competition',
            facultyId: req.user._id,
        };

        console.log('DEBUG: Creating competition with data:', JSON.stringify(competitionData, null, 2));

        const competition = await Exam.create(competitionData);

        logger.info(`Competition created: ${competition.title} by ${req.user.email}`);

        res.status(201).json({
            success: true,
            data: competition
        });

    } catch (error) {
        logger.error('Create competition error:', error);
        next(error);
    }
};

// @desc    Get active competitions
// @route   GET /api/competitions
// @access  Private
exports.getActiveCompetitions = async (req, res, next) => {
    try {
        const competitions = await Exam.find({
            examType: 'competition',
            status: 'scheduled',
            startTime: { $gte: new Date() }
        })
            .sort({ startTime: 1 })
            .select('title startTime duration totalMarks description');

        res.status(200).json({
            success: true,
            count: competitions.length,
            data: competitions
        });
    } catch (error) {
        logger.error('Get competitions error:', error);
        next(error);
    }
};
// @desc    Get competition by ID
// @route   GET /api/competitions/:id
// @access  Private
exports.getCompetitionById = async (req, res, next) => {
    try {
        const competition = await Exam.findById(req.params.id)
            .populate('questions.questionId')
            .populate('facultyId', 'name email');

        if (!competition || competition.examType !== 'competition') {
            return res.status(404).json({
                success: false,
                message: 'Competition not found',
            });
        }

        res.status(200).json({
            success: true,
            data: competition,
        });
    } catch (error) {
        logger.error('Get competition by ID error:', error);
        next(error);
    }
};

// @desc    Update competition
// @route   PUT /api/competitions/:id
// @access  Private/SuperAdmin
exports.updateCompetition = async (req, res, next) => {
    try {
        let competition = await Exam.findById(req.params.id);

        if (!competition || competition.examType !== 'competition') {
            return res.status(404).json({
                success: false,
                message: 'Competition not found',
            });
        }

        competition = await Exam.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        logger.info(`Competition updated: ${competition.title} by ${req.user.email}`);

        res.status(200).json({
            success: true,
            data: competition,
        });
    } catch (error) {
        logger.error('Update competition error:', error);
        next(error);
    }
};

// @desc    Delete competition
// @route   DELETE /api/competitions/:id
// @access  Private/SuperAdmin
exports.deleteCompetition = async (req, res, next) => {
    try {
        const competition = await Exam.findById(req.params.id);

        if (!competition || competition.examType !== 'competition') {
            return res.status(404).json({
                success: false,
                message: 'Competition not found',
            });
        }

        await competition.deleteOne();

        logger.info(`Competition deleted: ${competition.title} by ${req.user.email}`);

        res.status(200).json({
            success: true,
            message: 'Competition deleted successfully',
        });
    } catch (error) {
        logger.error('Delete competition error:', error);
        next(error);
    }
};

// @desc    Get all competitions (Admin View)
// @route   GET /api/competitions/admin/all
// @access  Private/SuperAdmin
exports.getAllCompetitions = async (req, res, next) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;

        const query = { examType: 'competition' };
        if (status) query.status = status;
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const competitions = await Exam.find(query)
            .sort({ createdAt: -1 })
            .populate('facultyId', 'name email')
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Exam.countDocuments(query);

        res.status(200).json({
            success: true,
            count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            data: competitions,
        });
    } catch (error) {
        logger.error('Get all competitions error:', error);
        next(error);
    }
};
