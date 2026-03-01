const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Question = require('../models/Question');
const logger = require('../config/logger');
const evaluationService = require('../services/evaluationService');
const compilerService = require('../services/compilerService');

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

// Helper: Reconcile stale exam statuses based on current time
const syncExamStatus = (exam) => {
  if (exam.status === 'draft' || exam.status === 'cancelled') return false;
  const now = new Date();
  const startTime = new Date(exam.startTime);
  const endTime = new Date(exam.endTime);

  let correctStatus;
  if (now < startTime) {
    correctStatus = 'scheduled';
  } else if (now >= startTime && now <= endTime) {
    correctStatus = 'ongoing';
  } else {
    correctStatus = 'completed';
  }

  if (exam.status !== correctStatus) {
    exam.status = correctStatus;
    return true;
  }
  return false;
};

// @desc    Get student dashboard
// @route   GET /api/student/dashboard
// @access  Private/Student
exports.getDashboard = async (req, res, next) => {
  try {
    const totalExamsGiven = await Result.countDocuments({
      studentId: req.user._id,
      status: { $in: ['submitted', 'evaluated', 'pending-evaluation'] },
    });

    const avgPerformance = await Result.aggregate([
      {
        $match: {
          studentId: req.user._id,
          status: { $in: ['submitted', 'evaluated', 'pending-evaluation'] },
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
      status: { $in: ['scheduled', 'ongoing'] },
      endTime: { $gte: new Date() },
      isPublished: true,
      $or: [
        { allowedStudents: req.user._id },
        { allowedStudents: { $size: 0 } },
      ],
    })
      .populate('subject', 'name')
      .populate('facultyId', 'name')
      .sort({ startTime: 1 })
      .limit(5);

    // Sync stale statuses
    for (const exam of upcomingExams) {
      if (syncExamStatus(exam)) {
        await Exam.updateOne({ _id: exam._id }, { status: exam.status });
      }
    }

    const recentResults = await Result.find({
      studentId: req.user._id,
      status: { $in: ['submitted', 'evaluated', 'pending-evaluation'] },
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
            status: { $in: ['submitted', 'evaluated', 'pending-evaluation'] },
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

    // Sync stale statuses
    const updates = [];
    for (const exam of exams) {
      if (syncExamStatus(exam)) {
        updates.push(Exam.updateOne({ _id: exam._id }, { status: exam.status }));
      }
    }
    if (updates.length > 0) await Promise.all(updates);

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
        message: `Exam has not started yet. It starts at ${new Date(exam.startTime).toLocaleString()}.`,
      });
    }

    if (now > exam.endTime) {
      return res.status(400).json({
        success: false,
        message: `Exam has already ended at ${new Date(exam.endTime).toLocaleString()}.`,
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
            questions: existingResult.answers.map(ans => {
              const q = exam.questions.find(eq => eq.questionId._id.toString() === ans.questionId.toString());
              return q ? sanitizeQuestion(q) : null;
            }).filter(q => !!q),
          },
          result: existingResult,
          remainingTime,
        },
      });
    }

    // Create new result
    let result;
    try {
      // Shuffle questions if randomized
      let resultQuestions = exam.questions;
      if (exam.isRandomized) {
        resultQuestions = [...exam.questions].sort(() => Math.random() - 0.5);
      }

      result = await Result.create({
        studentId: req.user._id,
        examId: req.params.id,
        status: 'in-progress',
        startedAt: Date.now(),
        answers: resultQuestions.map((q) => ({
          questionId: q.questionId._id,
          isEvaluated: false,
        })),
      });
    } catch (createError) {
      // Handle duplicate key error (race condition / double request)
      if (createError.code === 11000) {
        const existingResult = await Result.findOne({
          studentId: req.user._id,
          examId: req.params.id,
        });

        if (existingResult && existingResult.status === 'in-progress') {
          // Return existing in-progress exam
          const elapsedSeconds = Math.floor((Date.now() - existingResult.startedAt) / 1000);
          const totalSeconds = exam.duration * 60;
          const remainingTime = Math.max(0, totalSeconds - elapsedSeconds);

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
                questions: existingResult.answers.map(ans => {
                  const q = exam.questions.find(eq => eq.questionId._id.toString() === ans.questionId.toString());
                  return q ? sanitizeQuestion(q) : null;
                }).filter(q => !!q),
              },
              result: existingResult,
              remainingTime,
            },
          });
        } else if (existingResult) {
          return res.status(400).json({
            success: false,
            message: 'You have already submitted this exam',
          });
        }
      }
      throw createError;
    }

    // Prepare questions in the order of result.answers
    const questionsOrder = result.answers.map(a => a.questionId.toString());
    const questionsMap = {};
    exam.questions.forEach(q => {
      questionsMap[q.questionId._id.toString()] = q;
    });

    const questions = questionsOrder
      .map(id => questionsMap[id])
      .filter(q => !!q)
      .map(q => sanitizeQuestion(q));

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
      status: { $in: ['submitted', 'evaluated', 'pending-evaluation'] },
    });
    const avgScore = allResults.length > 0
      ? allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length
      : 0;
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
        score: exam.resultsPublished ? evaluationResult.score : null,
        percentage: exam.resultsPublished ? result.percentage : null,
        isPassed: exam.resultsPublished ? result.isPassed : null,
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
      status: { $in: ['submitted', 'evaluated', 'pending-evaluation'] },
    })
      .populate({
        path: 'examId',
        populate: {
          path: 'subject',
          select: 'name subjectCode',
        },
      })
      .sort({ submittedAt: -1 });

    // Filter: Show result if published OR if showResultsImmediately is true
    const filteredResults = results.map(r => {
      // Safety check if examId is populated
      if (!r.examId) return null;

      const isPublished = r.examId.resultsPublished; // Simplified to only check resultsPublished

      // If not published, we strip sensitive info but keep the entry so they know it's being evaluated
      if (!isPublished) {
        return {
          _id: r._id,
          examId: r.examId,
          status: r.status,
          submittedAt: r.submittedAt,
          isPublished: false,
          // Hide scores
          score: null,
          percentage: null,
          rank: null,
        };
      }
      return { ...r.toObject(), isPublished: true };
    }).filter(r => r !== null);

    res.status(200).json({
      success: true,
      count: filteredResults.length,
      data: filteredResults,
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

    // Check if exam still exists (may have been deleted)
    if (!result.examId) {
      return res.status(404).json({
        success: false,
        message: 'The exam associated with this result has been deleted',
      });
    }

    // Check if results are published
    const isPublished = result.examId.resultsPublished;
    if (!isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Results for this exam have not been published yet.',
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
    let examIds = [];

    if (examId) {
      examIds = [mongoose.Types.ObjectId(examId)];
    } else if (departmentWide) {
      const deptExams = await Exam.find({
        departmentId: req.user.departmentId,
      }).select('_id');
      examIds = deptExams.map((e) => e._id);
    }

    // Always filter by publication status
    const publishedExams = await Exam.find({
      _id: examIds.length > 0 ? { $in: examIds } : { $exists: true },
      resultsPublished: true
    }).select('_id');
    const publishedExamIds = publishedExams.map(e => e._id);

    matchQuery.examId = { $in: publishedExamIds };
    matchQuery.status = { $in: ['submitted', 'evaluated', 'pending-evaluation'] };

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
          status: { $in: ['submitted', 'evaluated', 'pending-evaluation'] },
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
        $match: {
          $or: [
            { 'exam.resultsPublished': true },
          ],
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
          status: { $in: ['submitted', 'evaluated', 'pending-evaluation'] },
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
        $match: {
          $or: [
            { 'exam.resultsPublished': true },
          ],
        },
      },
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
    const publishedExams = await Exam.find({
      resultsPublished: true
    }).select('_id');
    const publishedExamIds = publishedExams.map(e => e._id);

    const performanceTrend = await Result.find({
      studentId: req.user._id,
      status: { $in: ['submitted', 'evaluated', 'pending-evaluation'] },
      examId: { $in: publishedExamIds },
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

// @desc    Run code (compile & execute)
// @route   POST /api/student/run-code
// @access  Private/Student
exports.runCode = async (req, res, next) => {
  try {
    const { code, language, input, testCases, questionId } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Code and language are required',
      });
    }

    // If testCases provided, run against visible + hidden test cases
    if (testCases && testCases.length > 0) {
      // Run visible test cases (full details returned)
      const visibleResult = await compilerService.runAgainstTestCases(
        code,
        language,
        testCases
      );

      // Mark all visible results
      visibleResult.results = visibleResult.results.map(r => ({ ...r, isHidden: false }));

      // If questionId provided, also run hidden test cases
      let hiddenResults = [];
      let hiddenPassed = 0;
      let hiddenFailed = 0;
      let hiddenTotal = 0;

      if (questionId) {
        try {
          const question = await Question.findById(questionId).select('hiddenTestCases');
          if (question && question.hiddenTestCases && question.hiddenTestCases.length > 0) {
            const hiddenResult = await compilerService.runAgainstTestCases(
              code,
              language,
              question.hiddenTestCases
            );

            hiddenTotal = hiddenResult.summary.total;
            hiddenPassed = hiddenResult.summary.passed;
            hiddenFailed = hiddenResult.summary.failed;

            // Strip expected/actual output from hidden test cases — only show pass/fail
            hiddenResults = hiddenResult.results.map((r, idx) => ({
              passed: r.passed,
              isHidden: true,
              status: r.status,
              error: r.error || null,
              compile_output: r.compile_output || '',
              stderr: r.stderr || '',
              time: r.time,
              memory: r.memory,
            }));
          }
        } catch (err) {
          logger.warn('Could not fetch hidden test cases:', err.message);
        }
      }

      // Combine results
      const allResults = [...visibleResult.results, ...hiddenResults];
      const totalPassed = visibleResult.summary.passed + hiddenPassed;
      const totalFailed = visibleResult.summary.failed + hiddenFailed;
      const totalCount = visibleResult.summary.total + hiddenTotal;

      return res.status(200).json({
        success: true,
        data: {
          results: allResults,
          summary: {
            passed: totalPassed,
            failed: totalFailed,
            total: totalCount,
            visiblePassed: visibleResult.summary.passed,
            visibleTotal: visibleResult.summary.total,
            hiddenPassed: hiddenPassed,
            hiddenTotal: hiddenTotal,
          },
        },
      });
    }

    // Single execution with custom input
    const result = await compilerService.executeCode(code, language, input || '');

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Run code error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Code execution failed',
    });
  }
};
