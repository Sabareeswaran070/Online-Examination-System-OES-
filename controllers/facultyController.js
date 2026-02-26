const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Subject = require('../models/Subject');
const logger = require('../config/logger');

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
      : { 'assignedFaculty.facultyId': req.user._id };
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

// @desc    Create exam
// @route   POST /api/faculty/exams
// @access  Private/Faculty
exports.createExam = async (req, res, next) => {
  try {
    const examData = {
      ...req.body,
      facultyId: req.body.facultyId || req.user._id,
      departmentId: req.body.departmentId || req.user.departmentId || undefined,
      collegeId: req.body.collegeId || req.user.collegeId || undefined,
    };

    // Remove empty string IDs to prevent Mongoose CastError
    if (examData.departmentId === '') delete examData.departmentId;
    if (examData.collegeId === '') delete examData.collegeId;
    if (examData.subject === '') delete examData.subject;

    const exam = await Exam.create(examData);

    logger.info(`Exam created: ${exam.title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    logger.error('Create exam error:', error);
    next(error);
  }
};

// @desc    Get all exams created by faculty
// @route   GET /api/faculty/exams
// @access  Private/Faculty
exports.getExams = async (req, res, next) => {
  try {
    const { status, search, collegeId, departmentId, page = 1, limit = 10 } = req.query;

    console.log('DEBUG: getExams called by:', {
      user: req.user?.email,
      role: req.user?.role,
      isSuper: isSuperAdmin(req.user)
    });

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

    console.log('DEBUG: getExams query:', JSON.stringify(query));

    const exams = await Exam.find(query)
      .populate('subject', 'name subjectCode')
      .populate('departmentId', 'name')
      .populate('collegeId', 'collegeName')
      .populate('facultyId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log('DEBUG: getExams count:', exams.length);

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
    const findQuery = isSuperAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, facultyId: req.user._id };
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

    if (exam.status === 'ongoing' || exam.status === 'completed') {
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

// @desc    Add question to exam
// @route   POST /api/faculty/exams/:id/questions
// @access  Private/Faculty
exports.addQuestionToExam = async (req, res, next) => {
  try {
    const { questionId } = req.body;

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

    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    exam.questions.push({
      questionId,
      order: exam.questions.length + 1,
    });

    await exam.save();

    logger.info(`Question added to exam ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: exam,
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

    exam.isPublished = true;
    exam.publishedAt = Date.now();
    exam.status = 'scheduled';

    await exam.save();

    logger.info(`Exam published: ${exam.title} by ${req.user.email}`);

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
      query.$or = [
        { facultyId: req.user._id },
        { status: 'approved' }
      ];

      // Additional filters apply to BOTH sides of the OR (except when specifically filtering by status)
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

    const results = await Result.find({ examId: req.params.id })
      .populate('studentId', 'name email regNo enrollmentNumber')
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

// @desc    Evaluate descriptive answer
// @route   POST /api/faculty/evaluate/:resultId
// @access  Private/Faculty
exports.evaluateAnswer = async (req, res, next) => {
  try {
    const { answerId, marksAwarded, feedback } = req.body;

    const result = await Result.findById(req.params.resultId).populate(
      'examId'
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found',
      });
    }

    // Check if faculty owns this exam (superadmin can evaluate any)
    if (!isSuperAdmin(req.user) && result.examId.facultyId.toString() !== req.user._id.toString()) {
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

    answer.marksAwarded = marksAwarded;
    answer.isEvaluated = true;
    answer.evaluatedBy = req.user._id;
    answer.evaluatedAt = Date.now();
    answer.feedback = feedback;

    // Recalculate total score
    result.score = result.answers.reduce(
      (sum, ans) => sum + (ans.marksAwarded || 0),
      0
    );

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
