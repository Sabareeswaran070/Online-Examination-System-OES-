const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Question = require('../models/Question');
const logger = require('../config/logger');
const evaluationService = require('../services/evaluationService');

// Helper: sanitize question for student (strip correct answers)
const sanitizeQuestion = (q) => {
  const question = typeof q.questionId.toObject === 'function' ? q.questionId.toObject() : q.questionId;
  // Strip isCorrect from options
  if (question.options && question.options.length > 0) {
    question.options = question.options.map(opt => ({ text: opt.text }));
  }
  delete question.correctAnswer;
  delete question.hiddenTestCases;

  return {
    _id: question._id,
    questionText: question.questionText,
    type: question.type,
    options: question.options,
    marks: question.marks,
    order: q.order,
    imageUrl: question.imageUrl,
    codeSnippet: question.codeSnippet,
    programmingLanguage: question.programmingLanguage,
    inputFormat: question.inputFormat,
    outputFormat: question.outputFormat,
    constraints: question.constraints,
    visibleTestCases: question.visibleTestCases,
    testCases: question.testCases,
    timeLimit: question.timeLimit,
    memoryLimit: question.memoryLimit,
    starterCode: question.starterCode,
    sampleInput: question.sampleInput,
    sampleOutput: question.sampleOutput,
  };
};

// @desc    Get student dashboard
// @route   GET /api/student/dashboard
// @access  Private/Student
exports.getDashboard = async (req, res, next) => {
  try {
    const totalExamsGiven = await Result.countDocuments({
      studentId: req.user._id,
      status: { $in: ['submitted', 'evaluated'] },
    });

    const avgPerformance = await Result.aggregate([
      {
        $match: {
          studentId: req.user._id,
          status: { $in: ['submitted', 'evaluated'] },
        },
      },
      {
        $group: {
          _id: null,
          avgPercentage: { $avg: '$percentage' },
          totalScore: { $sum: '$score' },
        },
      },
    ]);

    const upcomingExams = await Exam.find({
      departmentId: req.user.departmentId,
      status: 'scheduled',
      startTime: { $gte: new Date() },
      $or: [
        { allowedStudents: req.user._id },
        { allowedStudents: { $size: 0 } },
      ],
    })
      .populate('subject', 'name')
      .populate('facultyId', 'name')
      .sort({ startTime: 1 })
      .limit(5);

    const recentResults = await Result.find({
      studentId: req.user._id,
      status: { $in: ['submitted', 'evaluated'] },
    })
      .populate({
        path: 'examId',
        populate: {
          path: 'subject',
          select: 'name',
        },
      })
      .sort({ submittedAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          totalExamsGiven,
          examsPassed: await Result.countDocuments({
            studentId: req.user._id,
            status: { $in: ['submitted', 'evaluated'] },
            isPassed: true,
          }),
          currentRank: 0, // Placeholder, will implement rank calculation if needed or leave as 0 for now
          avgPercentage: avgPerformance[0]?.avgPercentage || 0,
          totalScore: avgPerformance[0]?.totalScore || 0,
        },
        upcomingExams,
        recentResults,
        recentResults,
      },
      debugInfo: {
        userId: req.user._id,
        timestamp: new Date().toISOString()
      }
    });
    console.log('Student Dashboard - Sending response for user:', req.user._id);
  } catch (error) {
    logger.error('Get student dashboard error:', error);
    next(error);
  }
};

// @desc    Get available exams for student
// @route   GET /api/student/exams
// @access  Private/Student
exports.getAvailableExams = async (req, res, next) => {
  try {
    const { status } = req.query;

    const query = {
      departmentId: req.user.departmentId,
      isPublished: true,
      $or: [
        { allowedStudents: req.user._id },
        { allowedStudents: { $size: 0 } },
      ],
    };

    if (status) {
      query.status = status;
    }

    const exams = await Exam.find(query)
      .populate('subject', 'name subjectCode')
      .populate('facultyId', 'name')
      .sort({ startTime: 1 });

    // Check if student has already attempted
    const examsWithStatus = await Promise.all(
      exams.map(async (exam) => {
        const result = await Result.findOne({
          studentId: req.user._id,
          examId: exam._id,
        });

        return {
          ...exam.toObject(),
          attempted: !!result,
          resultStatus: result?.status,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: examsWithStatus.length,
      data: examsWithStatus,
    });
  } catch (error) {
    logger.error('Get available exams error:', error);
    next(error);
  }
};

// @desc    Get exam details
// @route   GET /api/student/exams/:id
// @access  Private/Student
exports.getExamDetails = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('subject', 'name subjectCode')
      .populate('facultyId', 'name');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Check if student is allowed to take this exam
    if (
      exam.allowedStudents.length > 0 &&
      !exam.allowedStudents.includes(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to take this exam',
      });
    }

    // Check if already attempted
    const existingResult = await Result.findOne({
      studentId: req.user._id,
      examId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: {
        exam: {
          _id: exam._id,
          title: exam.title,
          description: exam.description,
          subject: exam.subject,
          facultyId: exam.facultyId,
          startTime: exam.startTime,
          endTime: exam.endTime,
          duration: exam.duration,
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks,
          instructions: exam.instructions,
          totalQuestions: exam.questions.length,
        },
        attempted: !!existingResult,
        resultStatus: existingResult?.status,
      },
    });
  } catch (error) {
    logger.error('Get exam details error:', error);
    next(error);
  }
};

// @desc    Start exam
// @route   POST /api/student/exams/:id/start
// @access  Private/Student
exports.startExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(
      'questions.questionId'
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Check if exam is active
    const now = new Date();
    if (now < exam.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Exam has not started yet',
      });
    }

    if (now > exam.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Exam has ended',
      });
    }

    // Check if already started
    const existingResult = await Result.findOne({
      studentId: req.user._id,
      examId: req.params.id,
    });

    if (existingResult) {
      if (existingResult.status !== 'in-progress') {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted this exam',
        });
      }

      // Calculate remaining time
      const elapsedSeconds = Math.floor((Date.now() - existingResult.startedAt) / 1000);
      const totalSeconds = exam.duration * 60;
      const remainingTime = Math.max(0, totalSeconds - elapsedSeconds);

      // Return ongoing exam
      return res.status(200).json({
        success: true,
        message: 'Exam already in progress',
        data: {
          exam: {
            _id: exam._id,
            title: exam.title,
            subject: exam.subject,
            duration: exam.duration,
            totalMarks: exam.totalMarks,
            passingMarks: exam.passingMarks,
            questions: exam.questions.map((q) => sanitizeQuestion(q)),
          },
          result: existingResult,
          remainingTime,
        },
      });
    }

    // Create new result
    const result = await Result.create({
      studentId: req.user._id,
      examId: req.params.id,
      status: 'in-progress',
      startedAt: Date.now(),
      answers: exam.questions.map((q) => ({
        questionId: q.questionId._id,
        isEvaluated: false,
      })),
    });

    // Prepare questions (hide correct answers)
    const questions = exam.questions.map((q) => sanitizeQuestion(q));

    logger.info(
      `Exam started: ${exam.title} by student ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: {
        exam: {
          _id: exam._id,
          title: exam.title,
          subject: exam.subject,
          duration: exam.duration,
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks,
          questions,
        },
        result,
        remainingTime: exam.duration * 60,
      },
    });
  } catch (error) {
    logger.error('Start exam error:', error);
    next(error);
  }
};

// @desc    Submit exam
// @route   POST /api/student/exams/:id/submit
// @access  Private/Student
exports.submitExam = async (req, res, next) => {
  try {
    const { answers, autoSubmitted } = req.body;

    const result = await Result.findOne({
      studentId: req.user._id,
      examId: req.params.id,
      status: 'in-progress',
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Exam not started or already submitted',
      });
    }

    const exam = await Exam.findById(req.params.id).populate(
      'questions.questionId'
    );

    // Use Evaluation Service
    const evaluationResult = await evaluationService.evaluateExamSubmission(exam, result, answers);

    result.answers = evaluationResult.answers;
    result.score = evaluationResult.score;
    result.submittedAt = Date.now();
    result.autoSubmitted = autoSubmitted || false;

    const timeTaken = (result.submittedAt - result.startedAt) / 60000; // in minutes
    result.totalTimeTaken = Math.round(timeTaken);

    result.status = evaluationResult.hasDescriptive ? 'pending-evaluation' : 'submitted';

    await result.save();

    // Update exam statistics
    exam.totalAttempts += 1;
    const allResults = await Result.find({
      examId: req.params.id,
      status: { $in: ['submitted', 'evaluated'] },
    });
    const avgScore =
      allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length;
    exam.averageScore = avgScore;
    await exam.save();

    logger.info(
      `Exam submitted: ${exam.title} by student ${req.user.email}, Score: ${evaluationResult.score}`
    );

    res.status(200).json({
      success: true,
      message: evaluationResult.hasDescriptive
        ? 'Exam submitted. Awaiting evaluation for descriptive answers.'
        : 'Exam submitted successfully',
      data: {
        score: evaluationResult.score,
        percentage: result.percentage,
        isPassed: result.isPassed,
        status: result.status,
      },
    });
  } catch (error) {
    logger.error('Submit exam error:', error);
    next(error);
  }
};

// @desc    Save answer (for autosave during exam)
// @route   PUT /api/student/exams/:id/save-answer
// @access  Private/Student
exports.saveAnswer = async (req, res, next) => {
  try {
    const { questionId, selectedAnswer, textAnswer, codeAnswer } = req.body;

    const result = await Result.findOne({
      studentId: req.user._id,
      examId: req.params.id,
      status: 'in-progress',
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Exam not in progress',
      });
    }

    const answerIndex = result.answers.findIndex(
      (a) => a.questionId.toString() === questionId
    );

    if (answerIndex !== -1) {
      result.answers[answerIndex].selectedAnswer = selectedAnswer;
      result.answers[answerIndex].textAnswer = textAnswer;
      result.answers[answerIndex].codeAnswer = codeAnswer;

      await result.save();

      res.status(200).json({
        success: true,
        message: 'Answer saved',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }
  } catch (error) {
    logger.error('Save answer error:', error);
    next(error);
  }
};

// @desc    Get exam results
// @route   GET /api/student/results
// @access  Private/Student
exports.getResults = async (req, res, next) => {
  try {
    const results = await Result.find({
      studentId: req.user._id,
      status: { $in: ['submitted', 'evaluated'] },
    })
      .populate({
        path: 'examId',
        populate: {
          path: 'subject',
          select: 'name subjectCode',
        },
      })
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    logger.error('Get results error:', error);
    next(error);
  }
};

// @desc    Get single result with detailed answers
// @route   GET /api/student/results/:id
// @access  Private/Student
exports.getResultDetails = async (req, res, next) => {
  try {
    const result = await Result.findOne({
      _id: req.params.id,
      studentId: req.user._id,
    })
      .populate({
        path: 'examId',
        populate: [
          {
            path: 'subject',
            select: 'name subjectCode',
          },
          {
            path: 'facultyId',
            select: 'name',
          },
        ],
      })
      .populate('answers.questionId');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found',
      });
    }

    // Check if exam allows review
    if (!result.examId.allowReview && result.status === 'in-progress') {
      return res.status(403).json({
        success: false,
        message: 'Result review is not allowed for this exam',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get result details error:', error);
    next(error);
  }
};

// @desc    Get leaderboard
// @route   GET /api/student/leaderboard
// @access  Private/Student
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { examId, departmentWide } = req.query;

    let matchQuery = {};

    if (examId) {
      // Exam-specific leaderboard
      matchQuery.examId = mongoose.Types.ObjectId(examId);
    } else if (departmentWide) {
      // Department-wide leaderboard
      const exams = await Exam.find({
        departmentId: req.user.departmentId,
      }).select('_id');
      matchQuery.examId = { $in: exams.map((e) => e._id) };
    }

    matchQuery.status = { $in: ['submitted', 'evaluated'] };

    const leaderboard = await Result.aggregate([
      { $match: matchQuery },
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
      { $sort: { avgPercentage: -1 } },
      { $limit: 100 },
      {
        $project: {
          studentName: '$student.name',
          regNo: '$student.regNo',
          enrollmentNumber: '$student.enrollmentNumber',
          totalScore: 1,
          avgPercentage: 1,
          totalExams: 1,
        },
      },
    ]);

    // Find current student's rank
    const studentRank =
      leaderboard.findIndex(
        (entry) => entry._id.toString() === req.user._id.toString()
      ) + 1;

    res.status(200).json({
      success: true,
      count: leaderboard.length,
      studentRank: studentRank || 'Not ranked',
      data: leaderboard,
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    next(error);
  }
};

// @desc    Get performance analytics
// @route   GET /api/student/analytics
// @access  Private/Student
exports.getAnalytics = async (req, res, next) => {
  try {
    // Overall performance
    const overallStats = await Result.aggregate([
      {
        $match: {
          studentId: req.user._id,
          status: { $in: ['submitted', 'evaluated'] },
        },
      },
      {
        $group: {
          _id: null,
          totalExams: { $sum: 1 },
          avgPercentage: { $avg: '$percentage' },
          maxScore: { $max: '$score' },
          minScore: { $min: '$score' },
          totalScore: { $sum: '$score' },
        },
      },
    ]);

    // Subject-wise performance
    const subjectWise = await Result.aggregate([
      {
        $match: {
          studentId: req.user._id,
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
      {
        $lookup: {
          from: 'subjects',
          localField: 'exam.subject',
          foreignField: '_id',
          as: 'subject',
        },
      },
      { $unwind: '$subject' },
      {
        $group: {
          _id: '$subject._id',
          subjectName: { $first: '$subject.name' },
          avgPercentage: { $avg: '$percentage' },
          totalExams: { $sum: 1 },
        },
      },
    ]);

    // Performance trend (last 10 exams)
    const performanceTrend = await Result.find({
      studentId: req.user._id,
      status: { $in: ['submitted', 'evaluated'] },
    })
      .populate('examId', 'title')
      .sort({ submittedAt: -1 })
      .limit(10)
      .select('percentage score submittedAt examId');

    res.status(200).json({
      success: true,
      data: {
        overallStats: overallStats[0] || {},
        subjectWise,
        performanceTrend,
      },
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    next(error);
  }
};
