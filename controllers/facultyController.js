const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Subject = require('../models/Subject');
const User = require('../models/User');
const logger = require('../config/logger');
const aiService = require('../services/aiService');

// Helper: check if user is superadmin
const isSuperAdmin = (user) => user.role === 'superadmin';

// @desc    Get faculty dashboard
// @route   GET /api/faculty/dashboard
// @access  Private/Faculty
exports.getDashboard = async (req, res, next) => {
  try {
    const examQuery = isSuperAdmin(req.user) ? {} : { facultyId: req.user._id };
    const questionQuery = isSuperAdmin(req.user) ? {} : { facultyId: req.user._id };

    const totalExams = await Exam.countDocuments(examQuery);

    const totalQuestions = await Question.countDocuments(questionQuery);

    const completedExams = await Exam.countDocuments({
      ...examQuery,
      status: 'completed',
    });

    const upcomingExams = await Exam.find({
      ...examQuery,
      status: 'scheduled',
      startTime: { $gte: new Date() },
    })
      .populate('subject', 'name')
      .populate('facultyId', 'name')
      .sort({ startTime: 1 })
      .limit(5);

    const recentExams = await Exam.find(examQuery)
      .populate('subject', 'name')
      .populate('facultyId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const subjectQuery = isSuperAdmin(req.user)
      ? {}
      : { departmentId: req.user.departmentId };
    const subjects = await Subject.find(subjectQuery);

    console.log('Faculty Dashboard - Data fetched:', {
      totalExams,
      totalQuestions,
      completedExams,
      upcomingCount: upcomingExams.length,
      recentCount: recentExams.length,
      subjectsCount: subjects.length
    });

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          totalExams,
          totalQuestions,
          completedExams,
          totalSubjects: subjects.length,
        },
        upcomingExams,
        recentExams,
        subjects,
      },
    });
  } catch (error) {
    logger.error('Get faculty dashboard error:', error);
    next(error);
  }
};

// @desc    Get faculty assigned subjects
// @route   GET /api/faculty/subjects
// @access  Private/Faculty
exports.getSubjects = async (req, res, next) => {
  try {
    let query = {};

    if (isSuperAdmin(req.user)) {
      if (req.query.collegeId) query.collegeId = req.query.collegeId;
      if (req.query.departmentId) query.departmentId = req.query.departmentId;
    } else if (req.user.role === 'admin') {
      query.collegeId = req.user.collegeId;
      if (req.query.departmentId) query.departmentId = req.query.departmentId;
    } else {
      // Dept Head and Faculty restricted to their department
      query.departmentId = req.user.departmentId;
    }

    const subjects = await Subject.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    logger.error('Get faculty subjects error:', error);
    next(error);
  }
};

// @desc    Create exam
// @route   POST /api/faculty/exams
// @access  Private/Faculty
exports.createExam = async (req, res, next) => {
  try {
    const examData = {
      ...req.body,
      facultyId: req.body.facultyId || req.user._id,
    };

    // Role-based scope enforcement
    if (req.user.role === 'admin') {
      examData.collegeId = req.user.collegeId;
    } else if (req.user.role === 'depthead') {
      examData.collegeId = req.user.collegeId;
      examData.departmentId = req.user.departmentId;
    } else if (req.user.role === 'faculty') {
      examData.collegeId = req.user.collegeId;
      examData.departmentId = req.user.departmentId;
    }
    // Superadmin can provide their own college/dept if they want, or use what's in req.body

    // Ensure IDs are valid objects or undefined
    if (examData.departmentId === '') delete examData.departmentId;
    if (examData.collegeId === '') delete examData.collegeId;
    if (examData.subject === '') delete examData.subject;

    if (examData.subject && !isSuperAdmin(req.user)) {
      // Validate that the subject exists and belongs to the allowed scope
      const subject = await Subject.findById(examData.subject);

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: 'Subject not found',
        });
      }

      // Check department match for anyone below superadmin
      const userDeptId = req.user.departmentId?.toString();
      const subjectDeptId = subject.departmentId?.toString();

      // Dept Head and Faculty must match their department
      if (['depthead', 'faculty'].includes(req.user.role)) {
        if (userDeptId && subjectDeptId && userDeptId !== subjectDeptId) {
          return res.status(403).json({
            success: false,
            message: `Authorization failed. This subject belongs to a different department.`,
          });
        }
      }

      // College Admin must match their college
      if (req.user.role === 'admin') {
        const userCollegeId = req.user.collegeId?.toString();
        const subjectCollegeId = subject.collegeId?.toString();
        if (userCollegeId && subjectCollegeId && userCollegeId !== subjectCollegeId) {
          return res.status(403).json({
            success: false,
            message: `Authorization failed. This subject belongs to a different college.`,
          });
        }
      }
    }

    const exam = await Exam.create(examData);

    logger.info(`Exam created: ${exam.title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    console.error('DEBUG: Create Exam failed:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    logger.error('Create exam error:', error);
    next(error);
  }
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
    return true; // changed
  }
  return false;
};

// @desc    Get all exams created by faculty
// @route   GET /api/faculty/exams
// @access  Private/Faculty
exports.getExams = async (req, res, next) => {
  try {
    const { status, search, collegeId, departmentId, page = 1, limit = 10 } = req.query;

    const query = isSuperAdmin(req.user)
      ? {}
      : {
        $or: [
          { facultyId: req.user._id },
          { collegeId: req.user.collegeId },
          { contributingColleges: req.user.collegeId },
        ],
      };

    if (status) query.status = status;
    if (collegeId) query.collegeId = collegeId;
    if (departmentId) query.departmentId = departmentId;
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const exams = await Exam.find(query)
      .populate('subject', 'name subjectCode')
      .populate('departmentId', 'name')
      .populate('collegeId', 'collegeName')
      .populate('facultyId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Sync stale statuses
    const updates = [];
    for (const exam of exams) {
      if (syncExamStatus(exam)) {
        updates.push(Exam.updateOne({ _id: exam._id }, { status: exam.status }));
      }
    }
    if (updates.length > 0) await Promise.all(updates);

    const count = await Exam.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: exams,
    });
  } catch (error) {
    logger.error('Get exams error:', error);
    next(error);
  }
};

// @desc    Get single exam
// @route   GET /api/faculty/exams/:id
// @access  Private/Faculty
exports.getExam = async (req, res, next) => {
  try {
    const isAdmin = isSuperAdmin(req.user);
    const findQuery = isAdmin
      ? { _id: req.params.id }
      : {
        _id: req.params.id,
        $or: [
          { facultyId: req.user._id },
          { collegeId: req.user.collegeId },
          { contributingColleges: req.user.collegeId },
        ],
      };

    const exam = await Exam.findOne(findQuery)
      .populate('subject', 'name subjectCode')
      .populate('questions.questionId')
      .populate('facultyId', 'name email');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Sync stale status
    if (syncExamStatus(exam)) {
      await Exam.updateOne({ _id: exam._id }, { status: exam.status });
    }

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    logger.error('Get exam error:', error);
    next(error);
  }
};

// @desc    Update exam
// @route   PUT /api/faculty/exams/:id
// @access  Private/Faculty
exports.updateExam = async (req, res, next) => {
  try {
    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    let exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    if (exam.status === 'ongoing' || exam.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update ongoing or completed exam',
      });
    }

    exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    logger.info(`Exam updated: ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    logger.error('Update exam error:', error);
    next(error);
  }
};

// @desc    Delete exam
// @route   DELETE /api/faculty/exams/:id
// @access  Private/Faculty
exports.deleteExam = async (req, res, next) => {
  try {
    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    const exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Only restrict deletion for non-superadmin users
    if (!isSuperAdmin(req.user) && (exam.status === 'ongoing' || exam.status === 'completed')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ongoing or completed exam',
      });
    }

    await exam.deleteOne();

    logger.info(`Exam deleted: ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    logger.error('Delete exam error:', error);
    next(error);
  }
};

// @desc    Add questions to exam (Single or multiple)
// @route   POST /api/faculty/exams/:id/questions
// @access  Private/Faculty
exports.addQuestionToExam = async (req, res, next) => {
  try {
    const { questionId, questionIds } = req.body;

    // Normalize to an array of IDs
    let idsToAdd = [];
    if (questionIds && Array.isArray(questionIds)) {
      idsToAdd = questionIds;
    } else if (questionId) {
      idsToAdd = [questionId];
    }

    if (idsToAdd.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one question ID',
      });
    }

    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    const exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Filter out questions already in the exam to prevent duplicates
    const existingQuestionIds = exam.questions.map(q => q.questionId.toString());
    const uniqueIdsToAdd = idsToAdd.filter(id => !existingQuestionIds.includes(id));

    if (uniqueIdsToAdd.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected questions are already added to this exam',
      });
    }

    // Verify all new questions exist
    const questions = await Question.find({ _id: { $in: uniqueIdsToAdd } });
    if (questions.length !== uniqueIdsToAdd.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more questions not found',
      });
    }

    // Add new questions
    uniqueIdsToAdd.forEach((qId) => {
      exam.questions.push({
        questionId: qId,
        order: exam.questions.length + 1,
      });
    });

    await exam.save();

    logger.info(`${uniqueIdsToAdd.length} questions added to exam ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: exam,
      message: `${uniqueIdsToAdd.length} questions added successfully`,
    });
  } catch (error) {
    logger.error('Add question to exam error:', error);
    next(error);
  }
};

// @desc    Update marks for a question in an exam
// @route   PUT /api/faculty/exams/:id/questions/:questionId/marks
// @access  Private/Faculty
exports.updateExamQuestionMarks = async (req, res, next) => {
  try {
    const { marks } = req.body;

    if (marks === undefined || marks === null || marks < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid marks (>= 0)',
      });
    }

    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    const exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const qEntry = exam.questions.find(
      (q) => q.questionId.toString() === req.params.questionId
    );

    if (!qEntry) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in this exam',
      });
    }

    qEntry.marks = Number(marks);
    await exam.save();

    // Populate for response
    await exam.populate('questions.questionId');

    logger.info(`Marks updated for question in exam ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    logger.error('Update exam question marks error:', error);
    next(error);
  }
};

// @desc    Remove question from exam
// @route   DELETE /api/faculty/exams/:id/questions/:questionId
// @access  Private/Faculty
exports.removeQuestionFromExam = async (req, res, next) => {
  try {
    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    const exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const qIndex = exam.questions.findIndex(
      (q) => q.questionId.toString() === req.params.questionId
    );

    if (qIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in this exam',
      });
    }

    exam.questions.splice(qIndex, 1);

    // Re-order remaining questions
    exam.questions.forEach((q, idx) => {
      q.order = idx + 1;
    });

    await exam.save();

    logger.info(`Question removed from exam ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    logger.error('Remove question from exam error:', error);
    next(error);
  }
};

// @desc    Remove all questions from exam
// @route   DELETE /api/faculty/exams/:id/questions
// @access  Private/Faculty
exports.removeAllQuestionsFromExam = async (req, res, next) => {
  try {
    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    const exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Only superadmin can remove questions from non-draft exams
    if (!isSuperAdmin(req.user) && exam.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only remove questions from draft exams',
      });
    }

    const removedCount = exam.questions.length;
    exam.questions = [];
    await exam.save();

    logger.info(`All ${removedCount} questions removed from exam ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `${removedCount} questions removed from exam`,
      data: exam,
    });
  } catch (error) {
    logger.error('Remove all questions from exam error:', error);
    next(error);
  }
};

// @desc    Publish exam
// @route   POST /api/faculty/exams/:id/publish
// @access  Private/Faculty
exports.publishExam = async (req, res, next) => {
  try {
    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    const exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    if (exam.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish exam without questions',
      });
    }

    // Determine correct status based on current time
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    let computedStatus;
    if (now < startTime) {
      computedStatus = 'scheduled';
    } else if (now >= startTime && now <= endTime) {
      computedStatus = 'ongoing';
    } else {
      computedStatus = 'completed';
    }

    exam.isPublished = true;
    exam.publishedAt = Date.now();
    exam.status = computedStatus;

    await exam.save();

    logger.info(`Exam published: ${exam.title} by ${req.user.email} (status: ${computedStatus})`);

    res.status(200).json({
      success: true,
      message: 'Exam published successfully',
      data: exam,
    });
  } catch (error) {
    logger.error('Publish exam error:', error);
    next(error);
  }
};

// @desc    Create question
// @route   POST /api/faculty/questions
// @access  Private/Faculty
exports.createQuestion = async (req, res, next) => {
  try {
    const isGlobal = req.body.isGlobal === true || req.body.isGlobal === 'true';

    const questionData = {
      ...req.body,
      facultyId: req.body.facultyId || req.user._id,
      departmentId: req.body.departmentId || req.user.departmentId || undefined,
      isGlobal,
      // If it's a global question and user is NOT a superadmin, it needs approval (pending)
      // Otherwise (local question or superadmin contribution), it's approved by default
      status: (isGlobal && !isSuperAdmin(req.user)) ? 'pending' : 'approved',
    };

    // Remove empty string IDs to prevent Mongoose CastError
    if (questionData.departmentId === '') delete questionData.departmentId;
    if (questionData.subject === '') delete questionData.subject;

    const question = await Question.create(questionData);

    logger.info(`Question created by ${req.user.email} (Global: ${isGlobal}, Status: ${questionData.status})`);

    res.status(201).json({
      success: true,
      data: question,
    });
  } catch (error) {
    logger.error('Create question error:', error);
    next(error);
  }
};

// @desc    Get all questions (Question Bank)
// @route   GET /api/faculty/questions
// @access  Private/Faculty
exports.getQuestions = async (req, res, next) => {
  try {
    const { type, subject, difficulty, page = 1, limit = 20, search, status, isGlobal } = req.query;

    let query = { isActive: true };

    if (isSuperAdmin(req.user)) {
      // Super admin sees everything
      if (status) query.status = status;
      if (isGlobal !== undefined) query.isGlobal = isGlobal === 'true';
    } else {
      // Regular faculty case
      // 1. Can ALWAYS see their own questions (regardless of status/global)
      // OR 2. Can see any APPROVED question (global or local)
      // BUT: Exclude questions created by Super Admins
      const superAdmins = await User.find({ role: 'superadmin' }).select('_id');
      const superAdminIds = superAdmins.map(admin => admin._id);

      query.$and = [
        { facultyId: { $nin: superAdminIds } },
        {
          $or: [
            { facultyId: req.user._id },
            { status: 'approved' }
          ]
        }
      ];

      // Additional filters apply
      if (status) query.status = status;
      if (isGlobal !== undefined) query.isGlobal = isGlobal === 'true';
    }

    if (type) query.type = type;
    if (subject) query.subject = subject;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.questionText = { $regex: search, $options: 'i' };
    }

    const questions = await Question.find(query)
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Question.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: questions,
    });
  } catch (error) {
    logger.error('Get questions error:', error);
    next(error);
  }
};

// @desc    Update question
// @route   PUT /api/faculty/questions/:id
// @access  Private/Faculty
exports.updateQuestion = async (req, res, next) => {
  try {
    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    let question = await Question.findOne(findQuery);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    logger.info(`Question updated by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    logger.error('Update question error:', error);
    next(error);
  }
};

// @desc    Approve/Reject question
// @route   PUT /api/faculty/questions/:id/status
// @access  Private/SuperAdmin
exports.approveQuestion = async (req, res, next) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admins can approve questions',
      });
    }

    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected.',
      });
    }

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    logger.info(`Question ${req.params.id} ${status} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    logger.error('Approve question error:', error);
    next(error);
  }
};

// @desc    Delete question
// @route   DELETE /api/faculty/questions/:id
// @access  Private/Faculty
exports.deleteQuestion = async (req, res, next) => {
  try {
    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    const question = await Question.findOne(findQuery);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    await question.deleteOne();

    logger.info(`Question deleted by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    logger.error('Delete question error:', error);
    next(error);
  }
};

// @desc    Get exam results
// @route   GET /api/faculty/exams/:id/results
// @access  Private/Faculty
exports.getExamResults = async (req, res, next) => {
  try {
    const findQuery = {
      _id: req.params.id,
      $or: [
        { facultyId: req.user._id },
        { authorizedEvaluators: req.user._id },
      ],
    };

    const exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const results = await Result.find({ examId: req.params.id })
      .populate('studentId', 'name email regNo enrollmentNumber')
      .populate('answers.questionId')
      .sort({ score: -1 });

    // Calculate ranks
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    await Promise.all(results.map((result) => result.save()));

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    logger.error('Get exam results error:', error);
    next(error);
  }
};

// @desc    Publish exam results
// @route   POST /api/faculty/exams/:id/publish-results
// @access  Private/Faculty
exports.publishResults = async (req, res, next) => {
  try {
    const findQuery = {
      _id: req.params.id,
      $or: [
        { facultyId: req.user._id },
        { authorizedEvaluators: req.user._id },
      ],
    };

    const exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    if (exam.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only publish results for completed exams',
      });
    }

    exam.resultsPublished = true;
    exam.resultsPublishedAt = Date.now();
    await exam.save();

    logger.info(`Results published for exam: ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Results published successfully',
      data: exam,
    });
  } catch (error) {
    logger.error('Publish results error:', error);
    next(error);
  }
};

// @desc    Get all pending submissions for evaluation
// @route   GET /api/faculty/submissions/pending
// @access  Private/Faculty
exports.getPendingSubmissions = async (req, res, next) => {
  try {
    const examQuery = {
      $or: [
        { facultyId: req.user._id },
        { authorizedEvaluators: req.user._id },
      ],
    };

    const exams = await Exam.find(examQuery).select('_id title');
    const examIds = exams.map(e => e._id);

    const results = await Result.find({
      examId: { $in: examIds },
      status: 'submitted',
    })
      .populate('studentId', 'name email regNo enrollmentNumber')
      .populate('examId', 'title startTime endTime')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    logger.error('Get pending submissions error:', error);
    next(error);
  }
};

// @desc    Evaluate descriptive answer
// @route   POST /api/faculty/evaluate/:resultId
// @access  Private/Faculty
exports.evaluateAnswer = async (req, res, next) => {
  try {
    const { answerId, marksAwarded, feedback } = req.body;
    console.log(`Evaluating result ${req.params.resultId}, answer ${answerId}`, { marksAwarded, feedback });

    const result = await Result.findById(req.params.resultId).populate(
      'examId'
    );
    console.log('Result found:', !!result);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found',
      });
    }

    const isCreator = result.examId.facultyId.toString() === req.user._id.toString();
    const isAuthorizedEvaluator = result.examId.authorizedEvaluators &&
      result.examId.authorizedEvaluators.some(id => id.toString() === req.user._id.toString());

    if (!isCreator && !isAuthorizedEvaluator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to evaluate this result',
      });
    }

    const answer = result.answers.id(answerId);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found',
      });
    }

    // Ensure marksAwarded is a valid number
    const numericMarks = typeof marksAwarded === 'string' ? parseFloat(marksAwarded) || 0 : marksAwarded || 0;
    console.log(`Original marks: ${marksAwarded}, Parsed numeric marks: ${numericMarks}`);

    answer.marksAwarded = numericMarks;
    answer.isEvaluated = true;
    answer.evaluatedBy = req.user._id;
    answer.evaluatedAt = Date.now();
    answer.feedback = feedback;

    // Recalculate total score
    result.score = result.answers.reduce(
      (sum, ans) => sum + (ans.marksAwarded || 0),
      0
    );
    console.log(`New total score for result: ${result.score}`);

    // Check if all answers are evaluated
    const allEvaluated = result.answers.every((ans) => ans.isEvaluated);

    if (allEvaluated) {
      result.status = 'evaluated';
    }

    await result.save();

    logger.info(
      `Answer evaluated for result ${result._id} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Evaluate answer error:', error);
    next(error);
  }
};

// @desc    Evaluate student answer using AI
// @route   POST /api/faculty/evaluate/:resultId/ai
// @access  Private/Faculty
exports.evaluateAI = async (req, res, next) => {
  try {
    const { answerId } = req.body;
    const { resultId } = req.params;

    const result = await Result.findById(resultId).populate('examId');
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found',
      });
    }

    const exam = result.examId;
    const isCreator = exam.facultyId.toString() === req.user._id.toString();
    const isAuthorizedEvaluator = exam.authorizedEvaluators &&
      exam.authorizedEvaluators.some(id => id.toString() === req.user._id.toString());

    if (!isCreator && !isAuthorizedEvaluator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to evaluate this result',
      });
    }

    const answer = result.answers.id(answerId);
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found',
      });
    }

    const question = await Question.findById(answer.questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    if (question.type !== 'Coding') {
      return res.status(400).json({
        success: false,
        message: 'AI evaluation is only supported for coding questions',
      });
    }

    const evaluation = await aiService.evaluateCodingSubmission({
      question,
      submission: answer,
    });

    res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    logger.error('AI evaluation error:', error);
    next(error);
  }
};

// @desc    Generate random questions for exam
// @route   POST /api/faculty/exams/:id/generate-questions
// @access  Private/Faculty
exports.generateRandomQuestions = async (req, res, next) => {
  try {
    const { count, difficulty, type, subjectId } = req.body;

    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
    const exam = await Exam.findOne(findQuery);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const query = {
      isActive: true,
    };

    // Only filter by subject if one is provided or the exam has one
    const targetSubject = subjectId || exam.subject;
    if (targetSubject) {
      query.subject = targetSubject;
    }

    if (!isSuperAdmin(req.user)) {
      query.facultyId = req.user._id;
    }

    if (difficulty && difficulty !== '') query.difficulty = difficulty;
    if (type && type !== '') query.type = type;

    // Exclude questions already in the exam
    const existingQuestionIds = (exam.questions || [])
      .map(q => q.questionId)
      .filter(Boolean);
    if (existingQuestionIds.length > 0) {
      query._id = { $nin: existingQuestionIds };
    }

    const requestedCount = parseInt(count) || 10;

    const questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: requestedCount } },
    ]);

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No matching questions found. Try adjusting the filters or add questions to the bank first.',
      });
    }

    questions.forEach((question, index) => {
      exam.questions.push({
        questionId: question._id,
        order: exam.questions.length + index + 1,
      });
    });

    await exam.save();

    logger.info(
      `${questions.length} random questions added to exam ${exam.title}`
    );

    res.status(200).json({
      success: true,
      message: `${questions.length} questions added successfully`,
      data: exam,
    });
  } catch (error) {
    logger.error('Generate random questions error:', error);
    next(error);
  }
};
// @desc    Delegate evaluation access
// @route   PUT /api/faculty/exams/:id/delegate
// @access  Private/Faculty
exports.delegateEvaluation = async (req, res, next) => {
  try {
    const { userIds } = req.body; // Array of user IDs to delegate to

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs',
      });
    }

    const exam = await Exam.findOne({
      _id: req.params.id,
      facultyId: req.user._id, // Only creator can delegate
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or you are not the creator',
      });
    }

    exam.authorizedEvaluators = userIds;
    await exam.save();

    logger.info(`Evaluation access delegated for exam ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Evaluation access updated successfully',
      data: exam,
    });
  } catch (error) {
    logger.error('Delegate evaluation error:', error);
    next(error);
  }
};

// @desc    Generate AI questions (MCQ, Descriptive, TrueFalse, Coding)
// @route   POST /api/faculty/questions/generate-ai
// @access  Private/Faculty
exports.generateAIQuestions = async (req, res, next) => {
  try {
    const { topic, type = 'MCQ', difficulty = 'medium', count = 5, language = 'javascript', additionalInstructions = '', subjectId, examId, preview = false } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic/Subject is required for AI question generation',
      });
    }

    const validTypes = ['MCQ', 'Descriptive', 'TrueFalse', 'Coding'];
    const qType = validTypes.includes(type) ? type : 'MCQ';

    const questions = await aiService.generateQuestion({
      topic: topic.trim(),
      type: qType,
      difficulty,
      count: Math.min(Math.max(Number(count) || 5, 1), 20),
      language,
      additionalInstructions: additionalInstructions || '',
    });

    // If preview mode, return without saving
    if (preview) {
      return res.status(200).json({
        success: true,
        message: 'Preview generated successfully',
        data: count === 1 || questions.length === 1 ? questions[0] : questions,
      });
    }

    // Save all generated questions to DB
    const savedQuestions = [];
    for (const q of questions) {
      const questionData = {
        ...q,
        facultyId: req.user._id,
        subject: subjectId || undefined,
        status: 'approved', // Faculty generated AI questions are pre-approved
        isActive: true,
      };
      const saved = await Question.create(questionData);
      savedQuestions.push(saved);
    }

    // If examId is provided, add all questions to exam
    if (examId) {
      const exam = await Exam.findOne({ _id: examId, facultyId: req.user._id });
      if (exam) {
        savedQuestions.forEach((sq, index) => {
          exam.questions.push({
            questionId: sq._id,
            order: (exam.questions?.length || 0) + index + 1,
          });
        });
        await exam.save();
      }
    }

    logger.info(`AI generated ${savedQuestions.length} ${qType} questions by faculty ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `${savedQuestions.length} ${qType} questions generated and saved`,
      count: savedQuestions.length,
      data: savedQuestions,
    });
  } catch (error) {
    logger.error('Faculty AI generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate questions. Please try again.',
    });
  }
};
