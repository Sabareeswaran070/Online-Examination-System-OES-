const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Subject = require('../models/Subject');
const logger = require('../config/logger');

// @desc    Get faculty dashboard
// @route   GET /api/faculty/dashboard
// @access  Private/Faculty
exports.getDashboard = async (req, res, next) => {
  try {
    const totalExams = await Exam.countDocuments({
      facultyId: req.user._id,
    });

    const totalQuestions = await Question.countDocuments({
      facultyId: req.user._id,
    });

    const completedExams = await Exam.countDocuments({
      facultyId: req.user._id,
      status: 'completed',
    });

    const upcomingExams = await Exam.find({
      facultyId: req.user._id,
      status: 'scheduled',
      startTime: { $gte: new Date() },
    })
      .populate('subject', 'name')
      .sort({ startTime: 1 })
      .limit(5);

    const recentExams = await Exam.find({
      facultyId: req.user._id,
    })
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const subjects = await Subject.find({
      'assignedFaculty.facultyId': req.user._id,
    });

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
      facultyId: req.user._id,
      departmentId: req.user.departmentId,
      collegeId: req.user.collegeId,
    };

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
    const { status, page = 1, limit = 10 } = req.query;

    const query = { facultyId: req.user._id };
    if (status) query.status = status;

    const exams = await Exam.find(query)
      .populate('subject', 'name subjectCode')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

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
    const exam = await Exam.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    })
      .populate('subject', 'name subjectCode')
      .populate('questions.questionId');

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
    let exam = await Exam.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

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
    const exam = await Exam.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

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

    const exam = await Exam.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

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

// @desc    Publish exam
// @route   POST /api/faculty/exams/:id/publish
// @access  Private/Faculty
exports.publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

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
    const questionData = {
      ...req.body,
      facultyId: req.user._id,
      departmentId: req.user.departmentId,
    };

    const question = await Question.create(questionData);

    logger.info(`Question created by ${req.user.email}`);

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
    const { type, subject, difficulty, page = 1, limit = 20 } = req.query;

    const query = { facultyId: req.user._id, isActive: true };
    if (type) query.type = type;
    if (subject) query.subject = subject;
    if (difficulty) query.difficulty = difficulty;

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
    let question = await Question.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

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

// @desc    Delete question
// @route   DELETE /api/faculty/questions/:id
// @access  Private/Faculty
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

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
    const exam = await Exam.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const results = await Result.find({ examId: req.params.id })
      .populate('studentId', 'name email enrollmentNumber')
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

    // Check if faculty owns this exam
    if (result.examId.facultyId.toString() !== req.user._id.toString()) {
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

    const exam = await Exam.findOne({
      _id: req.params.id,
      facultyId: req.user._id,
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    const query = {
      facultyId: req.user._id,
      isActive: true,
      subject: subjectId || exam.subject,
    };

    if (difficulty) query.difficulty = difficulty;
    if (type) query.type = type;

    const questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: parseInt(count) } },
    ]);

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
