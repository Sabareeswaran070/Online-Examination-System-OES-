const User = require('../models/User');
const College = require('../models/College');
const Department = require('../models/Department');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Subject = require('../models/Subject');
const CompetitionCollege = require('../models/CompetitionCollege');
const logger = require('../config/logger');
const fs = require('fs');
const csv = require('csv-parser');

// @desc    Get college admin dashboard
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboard = async (req, res, next) => {
  try {
    const college = await College.findById(req.user.collegeId);

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    const totalDepartments = await Department.countDocuments({
      collegeId: req.user.collegeId,
    });

    const totalStudents = await User.countDocuments({
      collegeId: req.user.collegeId,
      role: 'student',
    });

    const totalFaculty = await User.countDocuments({
      collegeId: req.user.collegeId,
      role: 'faculty',
    });

    const totalExams = await Exam.countDocuments({
      collegeId: req.user.collegeId,
    });

    // Competition stats for this college
    const competitionStats = await CompetitionCollege.aggregate([
      { $match: { collegeId: req.user.collegeId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$collegeStatus', 'pending'] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ['$collegeStatus', 'accepted'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$collegeStatus', 'rejected'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved'] }, 1, 0] } },
        },
      },
    ]);

    const compStats = competitionStats[0] || { total: 0, pending: 0, accepted: 0, rejected: 0, approved: 0 };

    const recentExams = await Exam.find({ collegeId: req.user.collegeId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('facultyId', 'name')
      .populate('subject', 'name');

    const departments = await Department.aggregate([
      { $match: { collegeId: req.user.collegeId } },
      {
        $lookup: {
          from: 'users',
          let: { deptId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$departmentId', '$$deptId'] }, { $eq: ['$role', 'student'] }] } } },
            { $count: 'count' }
          ],
          as: 'studentCount'
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { deptId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$departmentId', '$$deptId'] }, { $eq: ['$role', 'faculty'] }] } } },
            { $count: 'count' }
          ],
          as: 'facultyCount'
        }
      },
      {
        $project: {
          departmentName: '$name',
          departmentCode: '$departmentCode',
          studentCount: { $ifNull: [{ $arrayElemAt: ['$studentCount.count', 0] }, 0] },
          facultyCount: { $ifNull: [{ $arrayElemAt: ['$facultyCount.count', 0] }, 0] }
        }
      }
    ]);

    console.log('College Admin Dashboard - Data:', {
      collegeId: req.user.collegeId,
      stats: {
        totalDepartments,
        totalStudents,
        totalFaculty,
        totalExams
      }
    });

    res.status(200).json({
      success: true,
      data: {
        college,
        statistics: {
          totalDepartments,
          totalStudents,
          totalFaculty,
          totalExams,
          totalCompetitions: compStats.total,
          pendingCompetitions: compStats.pending,
          acceptedCompetitions: compStats.accepted,
          approvedCompetitions: compStats.approved,
        },
        recentExams,
        departments,
      },
    });
  } catch (error) {
    logger.error('Get admin dashboard error:', error);
    next(error);
  }
};

// @desc    Create department
// @route   POST /api/admin/departments
// @access  Private/Admin
exports.createDepartment = async (req, res, next) => {
  try {
    const { name, departmentCode } = req.body;

    if (!name || !departmentCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both department name and code',
      });
    }

    // Check if department code already exists in this college
    const existingDept = await Department.findOne({
      collegeId: req.user.collegeId,
      departmentCode: departmentCode.toUpperCase(),
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: `Department code "${departmentCode.toUpperCase()}" already exists in your college`,
      });
    }

    const department = await Department.create({
      name,
      departmentCode: departmentCode.toUpperCase(),
      collegeId: req.user.collegeId,
    });

    // Add department to college
    await College.findByIdAndUpdate(req.user.collegeId, {
      $push: { departments: department._id },
    });

    logger.info(`Department created: ${department.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: department,
    });
  } catch (error) {
    logger.error('Create department error:', error);
    next(error);
  }
};

// @desc    Get all departments
// @route   GET /api/admin/departments
// @access  Private/Admin
exports.getDepartments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const query = { collegeId: req.user.collegeId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { departmentCode: { $regex: search, $options: 'i' } }
      ];
    }

    const departments = await Department.find(query)
      .populate('deptHeadId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Department.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: departments,
    });
  } catch (error) {
    logger.error('Get departments error:', error);
    next(error);
  }
};

// @desc    Update department
// @route   PUT /api/admin/departments/:id
// @access  Private/Admin
exports.updateDepartment = async (req, res, next) => {
  try {
    let department = await Department.findOne({
      _id: req.params.id,
      collegeId: req.user.collegeId,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    logger.info(
      `Department updated: ${department.name} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    logger.error('Update department error:', error);
    next(error);
  }
};

// @desc    Assign department head
// @route   PUT /api/admin/departments/:id/assign-head
// @access  Private/Admin
exports.assignDepartmentHead = async (req, res, next) => {
  try {
    const { deptHeadId } = req.body;

    const department = await Department.findOne({
      _id: req.params.id,
      collegeId: req.user.collegeId,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const deptHead = await User.findById(deptHeadId);
    if (!deptHead || deptHead.role !== 'depthead') {
      return res.status(400).json({
        success: false,
        message: 'Invalid department head user',
      });
    }

    department.deptHeadId = deptHeadId;
    deptHead.departmentId = department._id;
    deptHead.collegeId = req.user.collegeId;

    await department.save();
    await deptHead.save();

    logger.info(
      `Department head assigned: ${deptHead.email} to ${department.name}`
    );

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    logger.error('Assign department head error:', error);
    next(error);
  }
};

// @desc    Delete department
// @route   DELETE /api/admin/departments/:id
// @access  Private/Admin
exports.deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.id,
      collegeId: req.user.collegeId,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    // Check if there are students or faculty in this department
    const userCount = await User.countDocuments({ departmentId: req.params.id });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with associated users',
      });
    }

    await department.deleteOne();

    // Remove department from college
    await College.findByIdAndUpdate(req.user.collegeId, {
      $pull: { departments: department._id },
    });

    logger.info(`Department deleted: ${department.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully',
    });
  } catch (error) {
    logger.error('Delete department error:', error);
    next(error);
  }
};

// @desc    Bulk upload students
// @route   POST /api/admin/students/bulk-upload
// @access  Private/Admin
exports.bulkUploadStudents = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CSV file',
      });
    }

    const students = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        students.push({
          name: row.name,
          email: row.email,
          password: row.password || 'Student@123',
          role: 'student',
          collegeId: req.user.collegeId,
          departmentId: row.departmentId,
          regNo: row.regNo,
          enrollmentNumber: row.enrollmentNumber,
          phone: row.phone,
        });
      })
      .on('end', async () => {
        try {
          const created = await User.insertMany(students, {
            ordered: false,
          });

          // Delete uploaded file
          fs.unlinkSync(req.file.path);

          logger.info(
            `${created.length} students uploaded by ${req.user.email}`
          );

          res.status(201).json({
            success: true,
            message: `${created.length} students uploaded successfully`,
            data: created,
          });
        } catch (error) {
          logger.error('Bulk upload error:', error);
          res.status(400).json({
            success: false,
            message: 'Error uploading students',
            error: error.message,
          });
        }
      });
  } catch (error) {
    logger.error('Bulk upload students error:', error);
    next(error);
  }
};

// @desc    Get college analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res, next) => {
  try {
    // Department-wise student count
    const studentsByDepartment = await User.aggregate([
      {
        $match: {
          collegeId: req.user.collegeId,
          role: 'student',
        },
      },
      {
        $group: {
          _id: '$departmentId',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      {
        $unwind: '$department',
      },
      {
        $project: {
          departmentName: '$department.name',
          count: 1,
        },
      },
    ]);

    // Exam performance by department
    const examsByDepartment = await Exam.aggregate([
      {
        $match: {
          collegeId: req.user.collegeId,
        },
      },
      {
        $group: {
          _id: '$departmentId',
          totalExams: { $sum: 1 },
          avgScore: { $avg: '$averageScore' },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      {
        $unwind: '$department',
      },
      {
        $project: {
          departmentName: '$department.name',
          totalExams: 1,
          avgScore: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        studentsByDepartment,
        examsByDepartment,
      },
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    next(error);
  }
};

// @desc    Get college leaderboard
// @route   GET /api/admin/leaderboard
// @access  Private/Admin
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const leaderboard = await Result.aggregate([
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
          'exam.collegeId': req.user.collegeId,
        },
      },
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
      {
        $unwind: '$student',
      },
      {
        $sort: {
          avgPercentage: -1,
        },
      },
      {
        $limit: parseInt(limit),
      },
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

    res.status(200).json({
      success: true,
      count: leaderboard.length,
      data: leaderboard,
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    next(error);
  }
};

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Private/Admin
exports.getStudents = async (req, res, next) => {
  try {
    const { departmentId, page = 1, limit = 20, search } = req.query;

    const query = {
      collegeId: req.user.collegeId,
      role: 'student',
    };

    if (departmentId) {
      query.departmentId = departmentId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { regNo: { $regex: search, $options: 'i' } },
        { enrollmentNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(query)
      .populate('departmentId', 'name')
      .select('-password')
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

// @desc    Get all faculty
// @route   GET /api/admin/faculty
// @access  Private/Admin
exports.getFaculty = async (req, res, next) => {
  try {
    const { departmentId, page = 1, limit = 10, search } = req.query;

    const query = {
      collegeId: req.user.collegeId,
      role: { $in: ['faculty', 'depthead'] },
    };

    if (departmentId) {
      query.departmentId = departmentId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const faculty = await User.find(query)
      .populate('departmentId', 'name')
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: faculty,
    });
  } catch (error) {
    logger.error('Get faculty error:', error);
    next(error);
  }
};

// @desc    Create user (Student/Faculty/DeptHead)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!['student', 'faculty', 'depthead'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create this role',
      });
    }

    const userData = {
      ...req.body,
      collegeId: req.user.collegeId,
    };

    const user = await User.create(userData);

    logger.info(`User created by College Admin: ${user.email}`);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('College Admin Create user error:', error);
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    let user = await User.findOne({
      _id: req.params.id,
      collegeId: req.user.collegeId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    delete req.body.password;
    delete req.body.collegeId;

    if (req.body.role && !['student', 'faculty', 'depthead'].includes(req.body.role)) {
      delete req.body.role;
    }

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('College Admin Update user error:', error);
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      collegeId: req.user.collegeId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('College Admin Delete user error:', error);
    next(error);
  }
};
// @desc    Get subjects for a department
// @route   GET /api/admin/departments/:id/subjects
// @access  Private/Admin
exports.getDepartmentSubjects = async (req, res, next) => {
  try {
    const department = await Department.findOne({
      _id: req.params.id,
      collegeId: req.user.collegeId,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const subjects = await Subject.find({ departmentId: req.params.id })
      .populate('assignedFaculty.facultyId', 'name email');

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    logger.error('Get department subjects error:', error);
    next(error);
  }
};

// @desc    Create subject
// @route   POST /api/admin/subjects
// @access  Private/Admin
exports.createSubject = async (req, res, next) => {
  try {
    const { departmentId, ...subjectData } = req.body;

    const department = await Department.findOne({
      _id: departmentId,
      collegeId: req.user.collegeId,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const subject = await Subject.create({
      ...subjectData,
      departmentId,
      collegeId: req.user.collegeId,
    });

    // Add subject to department
    await Department.findByIdAndUpdate(departmentId, {
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

// @desc    Delete subject
// @route   DELETE /api/admin/subjects/:id
// @access  Private/Admin
exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      collegeId: req.user.collegeId,
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

    const departmentId = subject.departmentId;
    await subject.deleteOne();

    // Remove subject from department
    await Department.findByIdAndUpdate(departmentId, {
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
