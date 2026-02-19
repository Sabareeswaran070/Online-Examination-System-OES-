const Competition = require('../models/Competition');
const CompetitionCollege = require('../models/CompetitionCollege');
const College = require('../models/College');
const Result = require('../models/Result');
const User = require('../models/User');
const logger = require('../config/logger');

// =====================================================
// SUPER ADMIN: Competition CRUD + Workflow
// =====================================================

// @desc    Create a competition (status = pending)
// @route   POST /api/competitions
// @access  Private/SuperAdmin
exports.createCompetition = async (req, res, next) => {
  try {
    const competition = await Competition.create({
      ...req.body,
      createdBy: req.user._id,
      status: 'pending',
    });

    logger.info(`Competition created: ${competition.title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: competition,
    });
  } catch (error) {
    logger.error('Create competition error:', error);
    next(error);
  }
};

// @desc    Get all competitions (Super Admin view with filters)
// @route   GET /api/competitions/admin/all
// @access  Private/SuperAdmin
exports.getAllCompetitions = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };

    const competitions = await Competition.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('questions.questionId')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Competition.countDocuments(query);

    // Attach college stats for each competition
    const competitionsWithStats = await Promise.all(
      competitions.map(async (comp) => {
        const collegeCounts = await CompetitionCollege.aggregate([
          { $match: { competitionId: comp._id } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              accepted: {
                $sum: { $cond: [{ $eq: ['$collegeStatus', 'accepted'] }, 1, 0] },
              },
              rejected: {
                $sum: { $cond: [{ $eq: ['$collegeStatus', 'rejected'] }, 1, 0] },
              },
              pendingCollege: {
                $sum: { $cond: [{ $eq: ['$collegeStatus', 'pending'] }, 1, 0] },
              },
              approved: {
                $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved'] }, 1, 0] },
              },
            },
          },
        ]);

        return {
          ...comp.toObject(),
          collegeStats: collegeCounts[0] || {
            total: 0,
            accepted: 0,
            rejected: 0,
            pendingCollege: 0,
            approved: 0,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: competitionsWithStats,
    });
  } catch (error) {
    logger.error('Get all competitions error:', error);
    next(error);
  }
};

// @desc    Get single competition by ID
// @route   GET /api/competitions/:id
// @access  Private
exports.getCompetitionById = async (req, res, next) => {
  try {
    const competition = await Competition.findById(req.params.id)
      .populate('questions.questionId')
      .populate('createdBy', 'name email');

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found',
      });
    }

    // Also fetch college assignments
    const collegeAssignments = await CompetitionCollege.find({
      competitionId: req.params.id,
    })
      .populate('collegeId', 'collegeName collegeCode')
      .populate('collegeRespondedBy', 'name')
      .populate('approvedBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        ...competition.toObject(),
        colleges: collegeAssignments,
      },
    });
  } catch (error) {
    logger.error('Get competition by ID error:', error);
    next(error);
  }
};

// @desc    Update competition (only when pending/published)
// @route   PUT /api/competitions/:id
// @access  Private/SuperAdmin
exports.updateCompetition = async (req, res, next) => {
  try {
    let competition = await Competition.findById(req.params.id);

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found',
      });
    }

    if (competition.status === 'live' || competition.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a competition that is ${competition.status}`,
      });
    }

    competition = await Competition.findByIdAndUpdate(req.params.id, req.body, {
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
    const competition = await Competition.findById(req.params.id);

    if (!competition) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found',
      });
    }

    if (competition.status === 'live') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a live competition',
      });
    }

    await CompetitionCollege.deleteMany({ competitionId: req.params.id });
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

// @desc    Publish competition → sends to all active colleges
// @route   PUT /api/competitions/:id/publish
// @access  Private/SuperAdmin
exports.publishCompetition = async (req, res, next) => {
  try {
    const competition = await Competition.findById(req.params.id);

    if (!competition) {
      return res.status(404).json({ success: false, message: 'Competition not found' });
    }

    if (competition.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Competition is already ${competition.status}. Only pending competitions can be published.`,
      });
    }

    if (!competition.questions || competition.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish competition without questions.',
      });
    }

    const colleges = await College.find({ status: 'active' }).select('_id');

    if (colleges.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active colleges found to publish to.',
      });
    }

    const assignments = colleges.map((college) => ({
      competitionId: competition._id,
      collegeId: college._id,
      collegeStatus: 'pending',
      approvalStatus: 'pending',
    }));

    await CompetitionCollege.insertMany(assignments, { ordered: false }).catch(() => {});

    competition.status = 'published';
    competition.publishedAt = Date.now();
    await competition.save();

    logger.info(
      `Competition published: ${competition.title} to ${colleges.length} colleges by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      message: `Competition published to ${colleges.length} colleges`,
      data: competition,
    });
  } catch (error) {
    logger.error('Publish competition error:', error);
    next(error);
  }
};

// @desc    Super Admin approve/not-approve a college's acceptance
// @route   PUT /api/competitions/:id/colleges/:collegeId/approve
// @access  Private/SuperAdmin
exports.approveCollegeForCompetition = async (req, res, next) => {
  try {
    const { approve, note } = req.body;

    const assignment = await CompetitionCollege.findOne({
      competitionId: req.params.id,
      collegeId: req.params.collegeId,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'College assignment not found for this competition',
      });
    }

    if (assignment.collegeStatus !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'College has not accepted this competition yet',
      });
    }

    assignment.approvalStatus = approve ? 'approved' : 'not-approved';
    assignment.approvedAt = Date.now();
    assignment.approvedBy = req.user._id;
    assignment.approvalNote = note || '';
    await assignment.save();

    logger.info(
      `College ${req.params.collegeId} ${approve ? 'approved' : 'not-approved'} for competition ${req.params.id} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      message: `College ${approve ? 'approved' : 'not approved'} for competition`,
      data: assignment,
    });
  } catch (error) {
    logger.error('Approve college for competition error:', error);
    next(error);
  }
};

// @desc    Bulk approve all accepted colleges
// @route   PUT /api/competitions/:id/approve-all
// @access  Private/SuperAdmin
exports.approveAllAcceptedColleges = async (req, res, next) => {
  try {
    const result = await CompetitionCollege.updateMany(
      {
        competitionId: req.params.id,
        collegeStatus: 'accepted',
        approvalStatus: 'pending',
      },
      {
        $set: {
          approvalStatus: 'approved',
          approvedAt: Date.now(),
          approvedBy: req.user._id,
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} colleges approved`,
    });
  } catch (error) {
    logger.error('Approve all colleges error:', error);
    next(error);
  }
};

// @desc    Make competition live
// @route   PUT /api/competitions/:id/live
// @access  Private/SuperAdmin
exports.makeCompetitionLive = async (req, res, next) => {
  try {
    const competition = await Competition.findById(req.params.id);

    if (!competition) {
      return res.status(404).json({ success: false, message: 'Competition not found' });
    }

    if (competition.status !== 'published' && competition.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot make a ${competition.status} competition live. It must be published first.`,
      });
    }

    const approvedCount = await CompetitionCollege.countDocuments({
      competitionId: competition._id,
      approvalStatus: 'approved',
    });

    if (approvedCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one college must be approved before going live.',
      });
    }

    competition.status = 'live';
    competition.liveAt = Date.now();
    await competition.save();

    logger.info(`Competition made live: ${competition.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Competition is now live with ${approvedCount} approved colleges`,
      data: competition,
    });
  } catch (error) {
    logger.error('Make competition live error:', error);
    next(error);
  }
};

// @desc    Get college-wise status for a competition
// @route   GET /api/competitions/:id/colleges
// @access  Private/SuperAdmin
exports.getCompetitionColleges = async (req, res, next) => {
  try {
    const assignments = await CompetitionCollege.find({
      competitionId: req.params.id,
    })
      .populate('collegeId', 'collegeName collegeCode status')
      .populate('collegeRespondedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ collegeStatus: 1 });

    const stats = {
      total: assignments.length,
      pending: assignments.filter((a) => a.collegeStatus === 'pending').length,
      accepted: assignments.filter((a) => a.collegeStatus === 'accepted').length,
      rejected: assignments.filter((a) => a.collegeStatus === 'rejected').length,
      approved: assignments.filter((a) => a.approvalStatus === 'approved').length,
      notApproved: assignments.filter((a) => a.approvalStatus === 'not-approved').length,
    };

    res.status(200).json({
      success: true,
      stats,
      data: assignments,
    });
  } catch (error) {
    logger.error('Get competition colleges error:', error);
    next(error);
  }
};

// =====================================================
// COLLEGE ADMIN: Accept / Reject competitions
// =====================================================

// @desc    Get competitions published to this college
// @route   GET /api/competitions/college/my
// @access  Private/Admin
exports.getCollegeCompetitions = async (req, res, next) => {
  try {
    const assignments = await CompetitionCollege.find({
      collegeId: req.user.collegeId,
    })
      .populate({
        path: 'competitionId',
        populate: { path: 'createdBy', select: 'name' },
      })
      .sort({ createdAt: -1 });

    const competitions = assignments
      .filter((a) => a.competitionId) // filter out null refs
      .map((a) => ({
        _id: a.competitionId._id,
        title: a.competitionId.title,
        description: a.competitionId.description,
        startTime: a.competitionId.startTime,
        endTime: a.competitionId.endTime,
        duration: a.competitionId.duration,
        totalMarks: a.competitionId.totalMarks,
        totalQuestions: a.competitionId.questions?.length || 0,
        competitionStatus: a.competitionId.status,
        createdBy: a.competitionId.createdBy,
        assignmentId: a._id,
        collegeStatus: a.collegeStatus,
        approvalStatus: a.approvalStatus,
        collegeRespondedAt: a.collegeRespondedAt,
        approvalNote: a.approvalNote,
      }));

    res.status(200).json({
      success: true,
      count: competitions.length,
      data: competitions,
    });
  } catch (error) {
    logger.error('Get college competitions error:', error);
    next(error);
  }
};

// @desc    College admin accept/reject a competition
// @route   PUT /api/competitions/college/:competitionId/respond
// @access  Private/Admin
exports.respondToCompetition = async (req, res, next) => {
  try {
    const { action, rejectReason } = req.body;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be accept or reject',
      });
    }

    const assignment = await CompetitionCollege.findOne({
      competitionId: req.params.competitionId,
      collegeId: req.user.collegeId,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Competition not found for your college',
      });
    }

    if (assignment.collegeStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `You have already ${assignment.collegeStatus} this competition`,
      });
    }

    assignment.collegeStatus = action === 'accept' ? 'accepted' : 'rejected';
    assignment.collegeRespondedAt = Date.now();
    assignment.collegeRespondedBy = req.user._id;
    if (action === 'reject') {
      assignment.collegeRejectReason = rejectReason || '';
    }
    await assignment.save();

    logger.info(
      `College ${req.user.collegeId} ${action}ed competition ${req.params.competitionId} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      message: `Competition ${action}ed successfully`,
      data: assignment,
    });
  } catch (error) {
    logger.error('Respond to competition error:', error);
    next(error);
  }
};

// =====================================================
// STUDENT: Get live competitions
// =====================================================

// @desc    Get live competitions available to student's college
// @route   GET /api/competitions/student/available
// @access  Private/Student
exports.getStudentCompetitions = async (req, res, next) => {
  try {
    const approvedAssignments = await CompetitionCollege.find({
      collegeId: req.user.collegeId,
      approvalStatus: 'approved',
    }).select('competitionId');

    const competitionIds = approvedAssignments.map((a) => a.competitionId);

    const competitions = await Competition.find({
      _id: { $in: competitionIds },
      status: 'live',
    })
      .select('title description startTime endTime duration totalMarks questions')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: competitions.length,
      data: competitions,
    });
  } catch (error) {
    logger.error('Get student competitions error:', error);
    next(error);
  }
};

// =====================================================
// SUPER ADMIN: Live Scores
// =====================================================

// @desc    Get live scores for a competition (college + student breakdown)
// @route   GET /api/competitions/:id/live-scores
// @access  Private/SuperAdmin
exports.getCompetitionLiveScores = async (req, res, next) => {
  try {
    const competition = await Competition.findById(req.params.id);
    if (!competition) {
      return res.status(404).json({ success: false, message: 'Competition not found' });
    }

    const mongoose = require('mongoose');
    const compId = new mongoose.Types.ObjectId(req.params.id);

    // Only approved colleges
    const approvedAssignments = await CompetitionCollege.find({
      competitionId: compId,
      collegeStatus: 'accepted',
      approvalStatus: 'approved',
    }).select('collegeId');

    const approvedCollegeIds = approvedAssignments.map(a => a.collegeId);

    // Get students from approved colleges only
    const approvedStudents = await User.find({
      collegeId: { $in: approvedCollegeIds },
      role: 'student',
    }).select('_id');

    const approvedStudentIds = approvedStudents.map(s => s._id);

    // Get results only for approved college students
    const results = await Result.find({
      examId: compId,
      studentId: { $in: approvedStudentIds },
    })
      .populate('studentId', 'name email collegeId departmentId')
      .sort({ score: -1, submittedAt: 1 });

    // Get student college info
    const studentIds = results.map(r => r.studentId?._id).filter(Boolean);
    const students = await User.find({ _id: { $in: studentIds } })
      .populate('collegeId', 'collegeName collegeCode')
      .populate('departmentId', 'name')
      .select('name email collegeId departmentId');

    const studentMap = {};
    students.forEach(s => {
      studentMap[s._id.toString()] = s;
    });

    // Build student leaderboard
    let rank = 0;
    let prevScore = null;
    const studentLeaderboard = results.map((r, idx) => {
      const student = studentMap[r.studentId?._id?.toString()] || {};
      if (r.score !== prevScore) {
        rank = idx + 1;
        prevScore = r.score;
      }
      return {
        rank,
        studentName: student.name || r.studentId?.name || 'Unknown',
        email: student.email || r.studentId?.email || '',
        collegeName: student.collegeId?.collegeName || 'N/A',
        collegeCode: student.collegeId?.collegeCode || '',
        departmentName: student.departmentId?.name || 'N/A',
        score: r.score,
        percentage: r.percentage,
        status: r.status,
        totalTimeTaken: r.totalTimeTaken,
        submittedAt: r.submittedAt,
        startedAt: r.startedAt,
        isPassed: r.isPassed,
      };
    });

    // Aggregate by college
    const collegeMap = {};
    results.forEach(r => {
      const student = studentMap[r.studentId?._id?.toString()];
      const collegeName = student?.collegeId?.collegeName || 'Unknown';
      const collegeCode = student?.collegeId?.collegeCode || '';
      const key = student?.collegeId?._id?.toString() || 'unknown';

      if (!collegeMap[key]) {
        collegeMap[key] = {
          collegeName,
          collegeCode,
          totalStudents: 0,
          totalScore: 0,
          avgScore: 0,
          avgPercentage: 0,
          highestScore: 0,
          inProgress: 0,
          submitted: 0,
          percentageSum: 0,
        };
      }
      const c = collegeMap[key];
      c.totalStudents++;
      c.totalScore += r.score || 0;
      c.percentageSum += r.percentage || 0;
      c.highestScore = Math.max(c.highestScore, r.score || 0);
      if (r.status === 'in-progress') c.inProgress++;
      else c.submitted++;
    });

    const collegeLeaderboard = Object.values(collegeMap)
      .map(c => ({
        ...c,
        avgScore: c.totalStudents ? Math.round((c.totalScore / c.totalStudents) * 100) / 100 : 0,
        avgPercentage: c.totalStudents ? Math.round((c.percentageSum / c.totalStudents) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .map((c, idx) => ({ ...c, rank: idx + 1 }));

    // Summary stats
    const summary = {
      totalParticipants: results.length,
      inProgress: results.filter(r => r.status === 'in-progress').length,
      submitted: results.filter(r => r.status !== 'in-progress').length,
      avgScore: results.length
        ? Math.round((results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length) * 100) / 100
        : 0,
      highestScore: results.length ? Math.max(...results.map(r => r.score || 0)) : 0,
      totalColleges: Object.keys(collegeMap).length,
      passRate: results.length
        ? Math.round((results.filter(r => r.isPassed).length / results.length) * 100)
        : 0,
    };

    res.status(200).json({
      success: true,
      competition: {
        _id: competition._id,
        title: competition.title,
        totalMarks: competition.totalMarks,
        passingMarks: competition.passingMarks,
        duration: competition.duration,
        status: competition.status,
      },
      summary,
      collegeLeaderboard,
      studentLeaderboard,
    });
  } catch (error) {
    logger.error('Get competition live scores error:', error);
    next(error);
  }
};

// =====================================================
// PUBLIC: Leaderboard
// =====================================================

// @desc    Get global leaderboard
// @route   GET /api/competitions/leaderboard
// @access  Private
exports.getGlobalLeaderboard = async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;

    const pipeline = [
      {
        $match: {
          status: { $in: ['submitted', 'evaluated'] },
        },
      },
      {
        $lookup: {
          from: 'exams',
          localField: 'examId',
          foreignField: '_id',
          as: 'exam',
        },
      },
      { $unwind: '$exam' },
      { $match: { 'exam.examType': 'competition' } },
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
      {
        $lookup: {
          from: 'colleges',
          localField: 'student.collegeId',
          foreignField: '_id',
          as: 'college',
        },
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
      },
    ];

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
