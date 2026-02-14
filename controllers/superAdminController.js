const User = require('../models/User');
const College = require('../models/College');
const Department = require('../models/Department');
const Exam = require('../models/Exam');
const AuditLog = require('../models/AuditLog');
const Subject = require('../models/Subject');
const Question = require('../models/Question');
const QuestionSet = require('../models/QuestionSet');
const { parseQuestionCSV } = require('../utils/csvParser');
const logger = require('../config/logger');

// @desc    Get super admin dashboard statistics
// @route   GET /api/superadmin/dashboard
// @access  Private/SuperAdmin
exports.getDashboard = async (req, res, next) => {
  try {
    const totalColleges = await College.countDocuments();
    const activeColleges = await College.countDocuments({ status: 'active' });
    const totalUsers = await User.countDocuments();
    const totalExams = await Exam.countDocuments();

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const recentColleges = await College.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('adminId', 'name email');

    res.status(200).json({
      success: true,
      data: {
        totalColleges,
        activeColleges,
        totalUsers,
        totalExams,
        usersByRole,
        recentColleges,
      },
    });
  } catch (error) {
    logger.error('Get dashboard error:', error);
    next(error);
  }
};

// @desc    Create college
// @route   POST /api/superadmin/colleges
// @access  Private/SuperAdmin
exports.createCollege = async (req, res, next) => {
  try {
    const college = await College.create(req.body);

    logger.info(`College created: ${college.collegeName} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: college,
    });
  } catch (error) {
    logger.error('Create college error:', error);
    next(error);
  }
};

// @desc    Get all colleges
// @route   GET /api/superadmin/colleges
// @access  Private/SuperAdmin
exports.getAllColleges = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { collegeName: { $regex: search, $options: 'i' } },
        { collegeCode: { $regex: search, $options: 'i' } },
      ];
    }

    const colleges = await College.find(query)
      .populate('adminId', 'name email')
      .populate('departments', 'name departmentCode')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await College.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: colleges,
    });
  } catch (error) {
    logger.error('Get all colleges error:', error);
    next(error);
  }
};

// @desc    Get single college
// @route   GET /api/superadmin/colleges/:id
// @access  Private/SuperAdmin
exports.getCollege = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id)
      .populate('adminId', 'name email phone')
      .populate('departments');

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    res.status(200).json({
      success: true,
      data: college,
    });
  } catch (error) {
    logger.error('Get college error:', error);
    next(error);
  }
};

// @desc    Update college
// @route   PUT /api/superadmin/colleges/:id
// @access  Private/SuperAdmin
exports.updateCollege = async (req, res, next) => {
  try {
    let college = await College.findById(req.params.id);

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    college = await College.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    logger.info(`College updated: ${college.collegeName} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: college,
    });
  } catch (error) {
    logger.error('Update college error:', error);
    next(error);
  }
};

// @desc    Delete college
// @route   DELETE /api/superadmin/colleges/:id
// @access  Private/SuperAdmin
exports.deleteCollege = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id);

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    // Delete all departments associated with the college
    await Department.deleteMany({ collegeId: req.params.id });

    // Delete all users associated with the college
    await User.deleteMany({ collegeId: req.params.id });

    await college.deleteOne();

    logger.info(`College deleted: ${college.collegeName} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'College deleted successfully',
    });
  } catch (error) {
    logger.error('Delete college error:', error);
    next(error);
  }
};

// @desc    Toggle college status
// @route   PUT /api/superadmin/colleges/:id/status
// @access  Private/SuperAdmin
exports.toggleCollegeStatus = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id);

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    college.status = status;
    await college.save();

    logger.info(
      `College status changed to ${status}: ${college.collegeName} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: college,
    });
  } catch (error) {
    logger.error('Toggle college status error:', error);
    next(error);
  }
};

// @desc    Get platform analytics
// @route   GET /api/superadmin/analytics
// @access  Private/SuperAdmin
exports.getAnalytics = async (req, res, next) => {
  try {
    // User statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    // College statistics
    const collegeStats = await College.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Exam statistics
    const examStats = await Exam.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Monthly user registration trend
    const userTrend = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        userStats,
        collegeStats,
        examStats,
        userTrend,
      },
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    next(error);
  }
};

// @desc    Get audit logs
// @route   GET /api/superadmin/audit-logs
// @access  Private/SuperAdmin
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, resource, action, userId } = req.query;

    const query = {};
    if (resource) query.resource = resource;
    if (action) query.action = action;
    if (userId) query.userId = userId;

    const logs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: logs,
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    next(error);
  }
};

// @desc    Create user (any role)
// @route   POST /api/superadmin/users
// @access  Private/SuperAdmin
exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);

    logger.info(`User created: ${user.email} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Create user error:', error);
    next(error);
  }
};

// @desc    Assign college admin
// @route   PUT /api/superadmin/colleges/:id/assign-admin
// @access  Private/SuperAdmin
exports.assignCollegeAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.body;

    const college = await College.findById(req.params.id);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin user',
      });
    }

    college.adminId = adminId;
    admin.collegeId = college._id;

    await college.save();
    await admin.save();

    logger.info(
      `Admin assigned to college ${college.collegeName}: ${admin.email}`
    );

    res.status(200).json({
      success: true,
      data: college,
    });
  } catch (error) {
    logger.error('Assign college admin error:', error);
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/superadmin/users
// @access  Private/SuperAdmin
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('collegeId', 'collegeName')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: users,
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    next(error);
  }
};
// @desc    Update user
// @route   PUT /api/superadmin/users/:id
// @access  Private/SuperAdmin
exports.updateUser = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Don't allow updating password here, use a separate route or handling
    delete req.body.password;

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    logger.info(`User updated: ${user.email} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Update user error:', error);
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/superadmin/users/:id
// @access  Private/SuperAdmin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    await user.deleteOne();

    logger.info(`User deleted: ${user.email} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    next(error);
  }
};

// @desc    Toggle user status
// @route   PUT /api/superadmin/users/:id/status
// @access  Private/SuperAdmin
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    user.status = status;
    await user.save();

    logger.info(
      `User status changed to ${status}: ${user.email} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    next(error);
  }
};

// @desc    Get all questions (Global Database)
// @route   GET /api/superadmin/questions
// @access  Private/SuperAdmin
exports.getQuestions = async (req, res, next) => {
  try {
    const { type, subject, questionSet, difficulty, search, page = 1, limit = 20 } = req.query;

    const query = { isActive: true };
    if (type) query.type = type;
    if (subject) query.subject = subject;
    if (questionSet) query.questionSet = questionSet;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.questionText = { $regex: search, $options: 'i' };
    }

    const questions = await Question.find(query)
      .populate('subject', 'name')
      .populate('questionSet', 'name')
      .populate('facultyId', 'name email')
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
    logger.error('Superadmin get questions error:', error);
    next(error);
  }
};

// @desc    Create question
// @route   POST /api/superadmin/questions
// @access  Private/SuperAdmin
exports.createQuestion = async (req, res, next) => {
  try {
    const questionData = {
      ...req.body,
      facultyId: req.user._id, // Created by Super Admin
    };

    // Fix: Handle empty subject/questionSet string
    if (questionData.subject === '') {
      delete questionData.subject;
    }
    if (questionData.questionSet === '') {
      delete questionData.questionSet;
    }

    const question = await Question.create(questionData);

    logger.info(`Question created by Super Admin: ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: question,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.log('Mongoose Validation Error:', error.errors);
    }
    logger.error('Superadmin create question error:', error);
    next(error);
  }
};

// @desc    Update question
// @route   PUT /api/superadmin/questions/:id
// @access  Private/SuperAdmin
exports.updateQuestion = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // Fix: Handle empty subject/questionSet string
    if (updateData.subject === '') {
      updateData.subject = null;
    }
    if (updateData.questionSet === '') {
      updateData.questionSet = null;
    }

    const question = await Question.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    logger.info(`Question updated by Super Admin: ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    logger.error('Superadmin update question error:', error);
    next(error);
  }
};

// @desc    Delete question
// @route   DELETE /api/superadmin/questions/:id
// @access  Private/SuperAdmin
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    await question.deleteOne();

    logger.info(`Question deleted by Super Admin: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    logger.error('Superadmin delete question error:', error);
    next(error);
  }
};

// @desc    Get all subjects (Global)
// @route   GET /api/superadmin/subjects
// @access  Private/SuperAdmin
exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find()
      .populate('departmentId', 'name')
      .populate('collegeId', 'collegeName')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    logger.error('Superadmin get all subjects error:', error);
    next(error);
  }
};

// @desc    Bulk upload questions
// @route   POST /api/superadmin/questions/bulk-upload
// @access  Private/SuperAdmin
exports.bulkUploadQuestions = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CSV file',
      });
    }

    const questions = await parseQuestionCSV(req.file.path);

    // Add facultyId (Super Admin who uploaded)
    const questionsWithFaculty = questions.map((q) => ({
      ...q,
      facultyId: req.user._id,
    }));

    const createdQuestions = await Question.insertMany(questionsWithFaculty);

    logger.info(
      `${createdQuestions.length} questions uploaded by Super Admin: ${req.user.email}`
    );

    res.status(201).json({
      success: true,
      count: createdQuestions.length,
      data: createdQuestions,
    });
  } catch (error) {
    if (error.errors && error.questions) {
      return res.status(400).json({
        success: false,
        message: 'CSV contains validation errors',
        errors: error.errors,
      });
    }
    logger.error('Bulk upload questions error:', error);
    next(error);
  }
};

// @desc    Get all question sets
// @route   GET /api/superadmin/question-sets
// @access  Private/SuperAdmin
exports.getQuestionSets = async (req, res, next) => {
  try {
    const sets = await QuestionSet.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: sets });
  } catch (error) {
    logger.error('Get question sets error:', error);
    next(error);
  }
};

// @desc    Create question set
// @route   POST /api/superadmin/question-sets
// @access  Private/SuperAdmin
exports.createQuestionSet = async (req, res, next) => {
  try {
    const set = await QuestionSet.create({
      ...req.body,
      facultyId: req.user._id,
    });
    res.status(201).json({ success: true, data: set });
  } catch (error) {
    logger.error('Create question set error:', error);
    next(error);
  }
};

// @desc    Update question set
// @route   PUT /api/superadmin/question-sets/:id
// @access  Private/SuperAdmin
exports.updateQuestionSet = async (req, res, next) => {
  try {
    const set = await QuestionSet.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, data: set });
  } catch (error) {
    logger.error('Update question set error:', error);
    next(error);
  }
};

// @desc    Delete question set
// @route   DELETE /api/superadmin/question-sets/:id
// @access  Private/SuperAdmin
exports.deleteQuestionSet = async (req, res, next) => {
  try {
    const set = await QuestionSet.findById(req.params.id);
    if (!set) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Unlink questions from this set
    await Question.updateMany({ questionSet: req.params.id }, { $unset: { questionSet: "" } });

    await set.deleteOne();
    res.status(200).json({ success: true, message: 'Folder deleted' });
  } catch (error) {
    logger.error('Delete question set error:', error);
    next(error);
  }
};

// @desc    Bulk upload questions
// @route   POST /api/superadmin/questions/bulk-upload
// @access  Private/SuperAdmin
exports.bulkUploadQuestions = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CSV file',
      });
    }

    const { subjectId, questionSetId } = req.body;

    let questionsData;
    try {
      questionsData = await parseQuestionCSV(req.file.path);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'CSV parsing failed',
        errors: parseError.errors,
      });
    }

    // Prepare questions with additional context
    const preparedQuestions = questionsData.map((q) => ({
      ...q,
      facultyId: req.user._id,
      subject: q.subject || subjectId || undefined,
      questionSet: questionSetId || undefined,
    }));

    const result = await Question.insertMany(preparedQuestions);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    logger.info(`Bulk upload successful: ${result.length} questions added by ${req.user.email}`);

    res.status(201).json({
      success: true,
      count: result.length,
      message: `${result.length} questions uploaded successfully`,
    });
  } catch (error) {
    logger.error('Bulk upload questions error:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Create department for a college
// @route   POST /api/superadmin/colleges/:id/departments
// @access  Private/SuperAdmin
exports.createDepartmentForCollege = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }

    const { name, departmentCode } = req.body;

    if (!name || !departmentCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both department name and code',
      });
    }

    // Check if department code already exists in this college
    const existingDept = await Department.findOne({
      collegeId: req.params.id,
      departmentCode: departmentCode.toUpperCase(),
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: `Department code "${departmentCode.toUpperCase()}" already exists in this institution`,
      });
    }

    const department = await Department.create({
      name,
      departmentCode: departmentCode.toUpperCase(),
      collegeId: req.params.id,
    });

    college.departments.push(department._id);
    await college.save();

    logger.info(`Department ${name} created for college ${college.collegeName} by ${req.user.email}`);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    logger.error('Create department for college error:', error);
    next(error);
  }
};

// @desc    Update department for a college
// @route   PUT /api/superadmin/colleges/:id/departments/:deptId
// @access  Private/SuperAdmin
exports.updateDepartmentForCollege = async (req, res, next) => {
  try {
    const department = await Department.findOneAndUpdate(
      { _id: req.params.deptId, collegeId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    logger.info(`Department ${department.name} updated by ${req.user.email}`);
    res.status(200).json({ success: true, data: department });
  } catch (error) {
    logger.error('Update department error:', error);
    next(error);
  }
};

// @desc    Delete department from a college
// @route   DELETE /api/superadmin/colleges/:id/departments/:deptId
// @access  Private/SuperAdmin
exports.deleteDepartmentFromCollege = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.deptId,
      collegeId: req.params.id,
    });

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Check if there are users associated with this department
    const userCount = await User.countDocuments({ departmentId: req.params.deptId });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with associated users',
      });
    }

    await department.deleteOne();

    // Remove from college
    await College.findByIdAndUpdate(req.params.id, {
      $pull: { departments: req.params.deptId },
    });

    logger.info(`Department deleted from college ${req.params.id} by ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    logger.error('Delete department error:', error);
    next(error);
  }
};
