const Department = require('../models/Department');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Question = require('../models/Question');
const logger = require('../config/logger');
const aiService = require('../services/aiService');

// @desc    Get department head dashboard
// @route   GET /api/depthead/dashboard
// @access  Private/DeptHead
exports.getDashboard = async (req, res, next) => {
  try {
    const department = await Department.findById(req.user.departmentId)
      .populate('collegeId', 'collegeName')
      .populate('subjects');

    if (!department) {
      return res.status(200).json({
        success: true,
        data: {
          department: null,
          message: 'No department assigned. Please contact your administrator.',
          statistics: { totalStudents: 0, totalFaculty: 0, totalSubjects: 0, totalExams: 0 },
          upcomingExams: []
        },
      });
    }

    const totalStudents = await User.countDocuments({
      departmentId: req.user.departmentId,
      role: 'student',
    });

    const totalFaculty = await User.countDocuments({
      departmentId: req.user.departmentId,
      role: 'faculty',
    });

    const totalSubjects = await Subject.countDocuments({
      departmentId: req.user.departmentId,
    });

    const totalExams = await Exam.countDocuments({
      departmentId: req.user.departmentId,
    });

    const upcomingExams = await Exam.find({
      departmentId: req.user.departmentId,
      status: 'scheduled',
      startTime: { $gte: new Date() },
    })
      .sort({ startTime: 1 })
      .limit(5)
      .populate('facultyId', 'name')
      .populate('subject', 'name');

    res.status(200).json({
      success: true,
      data: {
        department,
        statistics: {
          totalStudents,
          totalFaculty,
          totalSubjects,
          totalExams,
        },
        upcomingExams,
      },
    });
  } catch (error) {
    logger.error('Get dept head dashboard error:', error);
    next(error);
  }
};

// @desc    Get department analytics
// @route   GET /api/depthead/analytics
// @access  Private/DeptHead
exports.getAnalytics = async (req, res, next) => {
  try {
    // Subject-wise exam count
    const examsBySubject = await Exam.aggregate([
      {
        $match: {
          departmentId: req.user.departmentId,
        },
      },
      {
        $group: {
          _id: '$subject',
          totalExams: { $sum: 1 },
          avgScore: { $avg: '$averageScore' },
        },
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id',
          foreignField: '_id',
          as: 'subject',
        },
      },
      {
        $unwind: '$subject',
      },
      {
        $project: {
          subjectName: '$subject.name',
          totalExams: 1,
          avgScore: 1,
        },
      },
    ]);

    // Faculty performance
    const facultyPerformance = await Exam.aggregate([
      {
        $match: {
          departmentId: req.user.departmentId,
        },
      },
      {
        $group: {
          _id: '$facultyId',
          totalExams: { $sum: 1 },
          avgScore: { $avg: '$averageScore' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'faculty',
        },
      },
      {
        $unwind: '$faculty',
      },
      {
        $project: {
          facultyName: '$faculty.name',
          totalExams: 1,
          avgScore: 1,
        },
      },
    ]);

    // Student performance distribution
    const performanceDistribution = await Result.aggregate([
      {
        $lookup: {
          from: 'exams',
          localField: 'examId',
          foreignField: '_id',
          as: 'exam',
        },
      },
      {
        $unwind: '$exam',
      },
      {
        $match: {
          'exam.departmentId': req.user.departmentId,
        },
      },
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 35, 50, 60, 75, 90, 101],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: '$score' },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        examsBySubject,
        facultyPerformance,
        performanceDistribution,
      },
    });
  } catch (error) {
    logger.error('Get dept head analytics error:', error);
    next(error);
  }
};

// @desc    Create subject
// @route   POST /api/depthead/subjects
// @access  Private/DeptHead
exports.createSubject = async (req, res, next) => {
  try {
    const subjectData = {
      ...req.body,
      departmentId: req.user.departmentId,
      collegeId: req.user.collegeId,
    };

    const subject = await Subject.create(subjectData);

    // Add subject to department
    await Department.findByIdAndUpdate(req.user.departmentId, {
      $push: { subjects: subject._id },
    });

    logger.info(`Subject created: ${subject.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    logger.error('Create subject error:', error);
    next(error);
  }
};

// @desc    Get all subjects
// @route   GET /api/depthead/subjects
// @access  Private/DeptHead
exports.getSubjects = async (req, res, next) => {
  try {
    const query = {
      departmentId: req.user.departmentId
    };

    const subjects = await Subject.find(query)
      .populate('departmentId', 'name')
      .populate('assignedFaculty.facultyId', 'name email');

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    logger.error('Get subjects error:', error);
    next(error);
  }
};

// @desc    Update subject
// @route   PUT /api/depthead/subjects/:id
// @access  Private/DeptHead
exports.updateSubject = async (req, res, next) => {
  try {
    let subject = await Subject.findOne({
      _id: req.params.id,
      departmentId: req.user.departmentId,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    logger.info(`Subject updated: ${subject.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    logger.error('Update subject error:', error);
    next(error);
  }
};

// @desc    Assign subject to faculty
// @route   POST /api/depthead/subjects/assign
// @access  Private/DeptHead
exports.assignSubjectToFaculty = async (req, res, next) => {
  try {
    const { subjectId, facultyId } = req.body;

    const subject = await Subject.findOne({
      _id: subjectId,
      departmentId: req.user.departmentId,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    const faculty = await User.findOne({
      _id: facultyId,
      role: 'faculty',
      departmentId: req.user.departmentId,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found',
      });
    }

    // Check if already assigned
    const alreadyAssigned = subject.assignedFaculty.some(
      (f) => f.facultyId.toString() === facultyId
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: 'Faculty is already assigned to this subject',
      });
    }

    subject.assignedFaculty.push({
      facultyId,
      assignedDate: Date.now(),
    });

    await subject.save();

    logger.info(
      `Faculty ${faculty.email} assigned to subject ${subject.name} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    logger.error('Assign subject faculty error:', error);
    next(error);
  }
};

// @desc    Unassign faculty from subject
// @route   POST /api/depthead/subjects/unassign
// @access  Private/DeptHead
exports.unassignFacultyFromSubject = async (req, res, next) => {
  try {
    const { subjectId, facultyId } = req.body;

    const subject = await Subject.findOne({
      _id: subjectId,
      departmentId: req.user.departmentId,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Remove faculty from assignedFaculty array
    subject.assignedFaculty = subject.assignedFaculty.filter(
      (f) => f.facultyId.toString() !== facultyId
    );

    await subject.save();

    logger.info(
      `Faculty ${facultyId} unassigned from subject ${subject.name} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    logger.error('Unassign subject faculty error:', error);
    next(error);
  }
};

// @desc    Get faculty workload
// @route   GET /api/depthead/faculty-workload
// @access  Private/DeptHead
exports.getFacultyWorkload = async (req, res, next) => {
  try {
    const workload = await Subject.aggregate([
      {
        $match: {
          departmentId: req.user.departmentId,
        },
      },
      {
        $unwind: '$assignedFaculty',
      },
      {
        $group: {
          _id: '$assignedFaculty.facultyId',
          subjectsCount: { $sum: 1 },
          subjects: {
            $push: {
              name: '$name',
              code: '$subjectCode',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'faculty',
        },
      },
      {
        $unwind: '$faculty',
      },
      {
        $lookup: {
          from: 'exams',
          let: { facultyId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$facultyId', '$$facultyId'] },
              },
            },
            { $count: 'total' },
          ],
          as: 'examCount',
        },
      },
      {
        $project: {
          facultyName: '$faculty.name',
          facultyEmail: '$faculty.email',
          subjectsCount: 1,
          subjects: 1,
          examsCreated: {
            $ifNull: [{ $arrayElemAt: ['$examCount.total', 0] }, 0],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: workload.length,
      data: workload,
    });
  } catch (error) {
    logger.error('Get faculty workload error:', error);
    next(error);
  }
};

// @desc    Get department students
// @route   GET /api/depthead/students
// @access  Private/DeptHead
exports.getStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const query = {
      departmentId: req.user.departmentId,
      role: 'student',
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { regNo: { $regex: search, $options: 'i' } },
        { enrollmentNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await User.find(query)
      .select('-password')
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
      data: students,
    });
  } catch (error) {
    logger.error('Get students error:', error);
    next(error);
  }
};

// @desc    Get department faculty
// @route   GET /api/depthead/faculty
// @access  Private/DeptHead
exports.getFaculty = async (req, res, next) => {
  try {
    const faculty = await User.find({
      departmentId: req.user.departmentId,
      role: { $in: ['faculty', 'depthead'] },
    })
      .select('-password')
      .populate('departmentId', 'name')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: faculty.length,
      data: faculty,
    });
  } catch (error) {
    logger.error('Get faculty error:', error);
    next(error);
  }
};

// @desc    Approve exam request
// @route   PUT /api/depthead/exams/:id/approve
// @access  Private/DeptHead
exports.approveExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      departmentId: req.user.departmentId,
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    exam.status = 'scheduled';
    await exam.save();

    logger.info(`Exam approved: ${exam.title} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Exam approved successfully',
      data: exam,
    });
  } catch (error) {
    logger.error('Approve exam error:', error);
    next(error);
  }
};
// @desc    Delete subject
// @route   DELETE /api/depthead/subjects/:id
// @access  Private/DeptHead
exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      departmentId: req.user.departmentId,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Check if there are exams associated with this subject
    const examCount = await Exam.countDocuments({ subject: req.params.id });
    if (examCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subject with associated exams',
      });
    }

    await subject.deleteOne();

    // Remove subject from department
    await Department.findByIdAndUpdate(req.user.departmentId, {
      $pull: { subjects: subject._id },
    });

    logger.info(`Subject deleted: ${subject.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    logger.error('Delete subject error:', error);
    next(error);
  }
};

// @desc    Create user (Faculty or Student) for department
// @route   POST /api/depthead/users
// @access  Private/DeptHead
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, regNo } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Role validation - Dept Head can only create faculty or students
    if (!['faculty', 'student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role assignment',
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      regNo,
      departmentId: req.user.departmentId,
      collegeId: req.user.collegeId,
      status: 'active'
    });

    logger.info(`${role.charAt(0).toUpperCase() + role.slice(1)} created by Dept Head ${req.user.email}: ${email}`);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Create department user error:', error);
    next(error);
  }
};

// @desc    Update user for department
// @route   PUT /api/depthead/users/:id
// @access  Private/DeptHead
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, regNo, status, password } = req.body;

    const user = await User.findOne({
      _id: req.params.id,
      departmentId: req.user.departmentId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in this department',
      });
    }

    // Cannot update to superadmin or admin
    if (req.body.role && !['faculty', 'student', 'depthead'].includes(req.body.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role update',
      });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.regNo = regNo || user.regNo;
    user.status = status || user.status;

    if (password) {
      user.password = password;
    }

    await user.save();

    logger.info(`User ${user.email} updated by Dept Head ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Update department user error:', error);
    next(error);
  }
};

// @desc    Delete user from department
// @route   DELETE /api/depthead/users/:id
// @access  Private/DeptHead
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      departmentId: req.user.departmentId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in this department',
      });
    }

    // Security: Dept Head cannot delete themselves or other Dept Heads or higher roles
    if (user.role === 'depthead' || user.role === 'admin' || user.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this user role'
      });
    }

    await user.deleteOne();

    logger.info(`User ${user.email} deleted by Dept Head ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete department user error:', error);
    next(error);
  }
};

// @desc    Generate AI questions (MCQ, Descriptive, TrueFalse, Coding)
// @route   POST /api/depthead/questions/generate-ai
// @access  Private/DeptHead
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
        status: 'approved',
        isActive: true,
      };
      const saved = await Question.create(questionData);
      savedQuestions.push(saved);
    }

    // If examId is provided, add all questions to exam
    if (examId) {
      // Dept head can add to any exam in their department
      const exam = await Exam.findOne({ _id: examId, departmentId: req.user.departmentId });
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

    logger.info(`AI generated ${savedQuestions.length} ${qType} questions by Dept Head ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `${savedQuestions.length} ${qType} questions generated and saved`,
      count: savedQuestions.length,
      data: savedQuestions,
    });
  } catch (error) {
    logger.error('Dept Head AI generation error:', error);
    next(error);
  }
};

// @desc    Get ongoing exams for department
// @route   GET /api/depthead/proctoring/ongoing
// @access  Private/DeptHead
exports.getOngoingExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({
      departmentId: req.user.departmentId,
      status: 'ongoing'
    })
      .populate('subject', 'name')
      .populate('facultyId', 'name')
      .sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    logger.error('Get ongoing exams error:', error);
    next(error);
  }
};

// @desc    Get department proctoring settings
// @route   GET /api/depthead/proctoring/settings
// @access  Private/DeptHead
exports.getProctoringSettings = async (req, res, next) => {
  try {
    const department = await Department.findById(req.user.departmentId);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.status(200).json({
      success: true,
      data: department.defaultProctoringSettings || {}
    });
  } catch (error) {
    logger.error('Get proctoring settings error:', error);
    next(error);
  }
};

// @desc    Update department proctoring settings
// @route   PUT /api/depthead/proctoring/settings
// @access  Private/DeptHead
exports.updateProctoringSettings = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.user.departmentId,
      { defaultProctoringSettings: req.body },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    logger.info(`Proctoring settings updated for department ${department.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: department.defaultProctoringSettings
    });
  } catch (error) {
    logger.error('Update proctoring settings error:', error);
    next(error);
  }
};
