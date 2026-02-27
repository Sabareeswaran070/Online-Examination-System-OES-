const User = require('../models/User');
const College = require('../models/College');
const Department = require('../models/Department');
const Exam = require('../models/Exam');
const AuditLog = require('../models/AuditLog');
const Subject = require('../models/Subject');
const Question = require('../models/Question');
const QuestionSet = require('../models/QuestionSet');
const { parseQuestionCSV } = require('../utils/csvParser');
const { generateCodingQuestion, generateQuestion } = require('../services/aiService');
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
      .populate('adminIds', 'name email');

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
    const collegeData = { ...req.body };

    // Handle address fields if sent at root level (consistency with frontend)
    if (collegeData.addressLine || collegeData.city || collegeData.state || collegeData.country) {
      collegeData.address = {
        street: collegeData.addressLine || collegeData.address?.street || '',
        city: collegeData.city || collegeData.address?.city || '',
        district: collegeData.district || collegeData.address?.district || '',
        state: collegeData.state || collegeData.address?.state || '',
        country: collegeData.country || collegeData.address?.country || 'India',
        zipCode: collegeData.zipCode || collegeData.address?.zipCode || '',
      };

      // Clean up root level address fields
      delete collegeData.addressLine;
    }

    const college = await College.create(collegeData);

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
      .populate('adminIds', 'name email')
      .populate({
        path: 'departments',
        select: 'name departmentCode subjects',
        populate: {
          path: 'subjects',
          model: 'Subject'
        }
      })
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
      .populate('adminIds', 'name email phone')
      .populate({
        path: 'departments',
        populate: {
          path: 'subjects',
          model: 'Subject'
        }
      });

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

// @desc    Get college impact statistics (for deletion preview)
// @route   GET /api/superadmin/colleges/:id/stats
// @access  Private/SuperAdmin
exports.getCollegeStats = async (req, res, next) => {
  try {
    const collegeId = req.params.id;
    const college = await College.findById(collegeId);

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    const counts = {
      departments: await Department.countDocuments({ collegeId }),
      users: await User.countDocuments({ collegeId }),
      subjects: await Subject.countDocuments({ collegeId }),
      exams: await Exam.countDocuments({ collegeId }),
    };

    res.status(200).json({
      success: true,
      data: {
        collegeName: college.collegeName,
        ...counts,
        totalImpact: Object.values(counts).reduce((a, b) => a + b, 0),
      },
    });
  } catch (error) {
    logger.error('Get college stats error:', error);
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

    const updateData = { ...req.body };

    // Handle address fields if sent at root level (consistency with frontend)
    if (updateData.addressLine || updateData.city || updateData.state || updateData.country) {
      updateData.address = {
        ...college.address,
        street: updateData.addressLine || updateData.address?.street || college.address?.street,
        city: updateData.city || updateData.address?.city || college.address?.city,
        state: updateData.state || updateData.address?.state || college.address?.state,
        country: updateData.country || updateData.address?.country || college.address?.country,
      };

      // Clean up root level address fields
      delete updateData.addressLine;
    }

    college = await College.findByIdAndUpdate(req.params.id, updateData, {
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

    // Delete all subjects associated with the college
    await Subject.deleteMany({ collegeId: req.params.id });

    // Delete all exams associated with the college
    await Exam.deleteMany({ collegeId: req.params.id });

    await college.deleteOne();

    logger.info(`College deleted: ${college.collegeName} (Cascaded: Departments, Users, Subjects, Exams) by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'College and all associated data deleted successfully',
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
    const { page = 1, limit = 20, resource, action, userId, search } = req.query;

    const query = {};
    if (resource) query.resource = resource;
    if (action) query.action = action;
    if (userId) query.userId = userId;

    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { resource: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

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

// @desc    Bulk upload users from CSV or Excel
// @route   POST /api/superadmin/users/bulk-upload
// @access  Private/SuperAdmin
exports.bulkUploadUsers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    const users = [];
    const errors = [];
    let processedCount = 0;

    if (fileExtension === 'csv') {
      const csv = require('csv-parser');
      const fs = require('fs');

      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => users.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      const headers = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value;
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip headers
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          rowData[headers[colNumber]] = cell.value;
        });
        users.push(rowData);
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid file format. Please upload CSV or Excel.' });
    }

    const results = {
      success: [],
      failed: [],
    };

    const defaultPassword = 'Welcome@123';

    for (const userData of users) {
      try {
        const { name, email, role, collegeId, departmentId, password, phone, regNo, enrollmentNumber, employeeId } = userData;

        if (!name || !email || !role) {
          results.failed.push({
            user: email || name || 'Unknown',
            reason: 'Missing required fields (name, email, or role)',
          });
          continue;
        }

        // Check if user already exists
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
          results.failed.push({
            user: email,
            reason: 'User with this email already exists',
          });
          continue;
        }

        const newUser = await User.create({
          name,
          email: email.toLowerCase(),
          role: role.toLowerCase(),
          collegeId: collegeId || null,
          departmentId: departmentId || null,
          password: password || defaultPassword,
          phone: phone || '',
          regNo: regNo || '',
          enrollmentNumber: enrollmentNumber || '',
          employeeId: employeeId || '',
          status: 'active',
        });

        results.success.push({
          email: newUser.email,
          id: newUser._id,
        });
        processedCount++;
      } catch (error) {
        results.failed.push({
          user: userData.email || 'Unknown',
          reason: error.message,
        });
      }
    }

    // Clean up file
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    logger.info(`Bulk user upload completed. Success: ${results.success.length}, Failed: ${results.failed.length}`);

    res.status(200).json({
      success: true,
      message: `Processed ${users.length} users. ${results.success.length} created, ${results.failed.length} failed.`,
      summary: {
        total: users.length,
        created: results.success.length,
        failed: results.failed.length,
      },
      errors: results.failed,
    });
  } catch (error) {
    logger.error('Bulk upload users error:', error);
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


    const admin = await User.findById(adminId).select('+password');
    if (!admin || admin.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin user',
      });
    }
    // Ensure admin is active
    if (admin.status !== 'active') {
      admin.status = 'active';
    }
    // Ensure admin has a password
    if (!admin.password) {
      return res.status(400).json({
        success: false,
        message: 'Admin user does not have a password set. Please set a password for this user before assignment.',
      });
    }

    // Check if admin is already assigned to this or another college
    if (admin.collegeId) {
      if (admin.collegeId.toString() === college._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'This admin is already assigned to this college',
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'This person is already a college admin for another institution. A person can only be admin for one college.',
        });
      }
    }

    // Add admin to this college's adminIds array
    if (!college.adminIds) college.adminIds = [];
    college.adminIds.push(adminId);
    admin.collegeId = college._id;

    await college.save();
    await admin.save();

    // Re-populate for response
    await college.populate('adminIds', 'name email');

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

// @desc    Remove college admin
// @route   PUT /api/superadmin/colleges/:id/remove-admin
// @access  Private/SuperAdmin
exports.removeCollegeAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.body;

    const college = await College.findById(req.params.id);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found',
      });
    }

    // Remove admin from the array
    college.adminIds = (college.adminIds || []).filter(
      id => id.toString() !== adminId
    );
    await college.save();

    // Clear the admin's collegeId
    await User.findByIdAndUpdate(adminId, { $unset: { collegeId: 1 } });

    await college.populate('adminIds', 'name email');

    logger.info(`Admin removed from college ${college.collegeName} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: college,
    });
  } catch (error) {
    logger.error('Remove college admin error:', error);
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/superadmin/users
// @access  Private/SuperAdmin
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search, status, collegeId, departmentId, page = 1, limit = 10 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (collegeId) query.collegeId = collegeId;
    if (departmentId) query.departmentId = departmentId;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { regNo: { $regex: search, $options: 'i' } },
        { enrollmentNumber: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
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

// @desc    Reset user password (Super Admin)
// @route   PUT /api/superadmin/users/:id/reset-password
// @access  Private/SuperAdmin
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both new password and confirm password',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.params.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password reset for user ${user.email} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    logger.error('Reset user password error:', error);
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

// @desc    Get all exams globally
// @route   GET /api/superadmin/exams
// @access  Private/SuperAdmin
exports.getAllExams = async (req, res, next) => {
  try {
    const { status, search, collegeId, departmentId, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status && status !== '') query.status = status;
    if (collegeId && collegeId !== '') query.collegeId = collegeId;
    if (departmentId && departmentId !== '') query.departmentId = departmentId;
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
    logger.error('Superadmin get all exams error:', error);
    next(error);
  }
};

// @desc    Assign exam to multiple colleges (clone exam to each college/department)
// @route   POST /api/superadmin/exams/:id/assign-colleges
// @access  Private/SuperAdmin
exports.assignExamToColleges = async (req, res, next) => {
  try {
    const { assignments } = req.body;
    // assignments: [{ collegeId, departmentId, subject }]

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one college assignment',
      });
    }

    const sourceExam = await Exam.findById(req.params.id).populate('questions.questionId');
    if (!sourceExam) {
      return res.status(404).json({
        success: false,
        message: 'Source exam not found',
      });
    }

    const results = { created: [], failed: [] };

    for (const assignment of assignments) {
      try {
        const existing = await Exam.findOne({
          title: sourceExam.title,
          collegeId: assignment.collegeId,
          departmentId: assignment.departmentId,
        });

        if (existing) {
          results.failed.push({
            collegeId: assignment.collegeId,
            reason: 'Exam with same title already exists for this college/department',
          });
          continue;
        }

        const clonedExam = await Exam.create({
          title: sourceExam.title,
          description: sourceExam.description,
          subject: assignment.subject || sourceExam.subject,
          facultyId: req.user._id,
          departmentId: assignment.departmentId,
          collegeId: assignment.collegeId,
          startTime: sourceExam.startTime,
          endTime: sourceExam.endTime,
          duration: sourceExam.duration,
          totalMarks: sourceExam.totalMarks,
          passingMarks: sourceExam.passingMarks,
          questions: sourceExam.questions.map(q => ({
            questionId: q.questionId._id || q.questionId,
            order: q.order,
            marks: q.marks,
          })),
          instructions: sourceExam.instructions,
          examType: sourceExam.examType,
          status: 'draft',
          isRandomized: sourceExam.isRandomized,
          allowReview: sourceExam.allowReview,
          showResultsImmediately: sourceExam.showResultsImmediately,
          negativeMarkingEnabled: sourceExam.negativeMarkingEnabled,
          proctoring: sourceExam.proctoring,
          isPublished: false,
        });

        results.created.push({
          examId: clonedExam._id,
          collegeId: assignment.collegeId,
          departmentId: assignment.departmentId,
        });
      } catch (err) {
        results.failed.push({
          collegeId: assignment.collegeId,
          reason: err.message,
        });
      }
    }

    // Update source exam's contributingColleges
    const newCollegeIds = results.created.map(r => r.collegeId);
    const existingIds = (sourceExam.contributingColleges || []).map(id => id.toString());
    const merged = [...new Set([...existingIds, ...newCollegeIds.map(id => id.toString())])];
    sourceExam.contributingColleges = merged;
    await sourceExam.save();

    logger.info(
      `Exam "${sourceExam.title}" assigned to ${results.created.length} colleges by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      message: `Exam assigned to ${results.created.length} college(s). ${results.failed.length} failed.`,
      data: results,
    });
  } catch (error) {
    logger.error('Assign exam to colleges error:', error);
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
    const { type, subject, questionSet, difficulty, search, page = 1, limit = 20, status, isGlobal } = req.query;

    const query = { isActive: true };
    if (status && status !== '') query.status = status;
    if (isGlobal !== undefined && isGlobal !== '') query.isGlobal = isGlobal === 'true';
    if (type && type !== '') query.type = type;
    if (subject && subject !== '') query.subject = subject;
    if (questionSet && questionSet !== '') query.questionSet = questionSet;
    if (difficulty && difficulty !== '') query.difficulty = difficulty;
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
      status: 'approved',
      isGlobal: req.body.isGlobal !== undefined ? (req.body.isGlobal === true || req.body.isGlobal === 'true') : true,
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

// @desc    Update question status (Approve/Reject)
// @route   PUT /api/superadmin/questions/:id/status
// @access  Private/SuperAdmin
exports.updateQuestionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
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

    logger.info(`Question ${req.params.id} status updated to ${status} by Super Admin`);

    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    logger.error('Update question status error:', error);
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
    const { page = 1, limit = 10, search } = req.query;

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const sets = await QuestionSet.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await QuestionSet.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: sets,
    });
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
    const { name } = req.body;

    // Check for duplicate folder name
    const existingSet = await QuestionSet.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      facultyId: req.user._id
    });

    if (existingSet) {
      return res.status(400).json({
        success: false,
        message: `A folder named "${name}" already exists`
      });
    }

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

// @desc    Generate a coding question using AI
// @route   POST /api/superadmin/questions/generate-ai
// @access  Private/SuperAdmin
// @desc    Lookup pincode details (place, district, state, country)
// @route   GET /api/superadmin/pincode/:pincode
// @access  Private/SuperAdmin
// @desc    Create subject for a department
// @route   POST /api/superadmin/colleges/:id/departments/:deptId/subjects
// @access  Private/SuperAdmin
exports.createSubjectForDepartment = async (req, res, next) => {
  try {
    const { id: collegeId, deptId: departmentId } = req.params;
    const { name, subjectCode, description } = req.body;

    // Verify department belongs to college
    const department = await Department.findOne({ _id: departmentId, collegeId });
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found in this college',
      });
    }

    const subject = await Subject.create({
      name,
      subjectCode,
      description,
      departmentId,
      collegeId,
    });

    // Add subject to department
    await Department.findByIdAndUpdate(departmentId, {
      $push: { subjects: subject._id },
    });

    logger.info(`Subject created by Super Admin: ${subject.name} for department ${department.name}`);

    res.status(201).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    logger.error('Create subject (Super Admin) error:', error);
    next(error);
  }
};

// @desc    Get all subjects for a department
// @route   GET /api/superadmin/colleges/:id/departments/:deptId/subjects
// @access  Private/SuperAdmin
exports.getDepartmentSubjects = async (req, res, next) => {
  try {
    const { id: collegeId, deptId: departmentId } = req.params;

    const subjects = await Subject.find({ departmentId, collegeId });

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    logger.error('Get department subjects (Super Admin) error:', error);
    next(error);
  }
};

// @desc    Delete subject
// @route   DELETE /api/superadmin/subjects/:id
// @access  Private/SuperAdmin
exports.deleteSubjectFromDepartment = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);

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

    const { departmentId, _id: subjectId } = subject;
    await subject.deleteOne();

    // Remove subject from department
    await Department.findByIdAndUpdate(departmentId, {
      $pull: { subjects: subjectId },
    });

    logger.info(`Subject deleted by Super Admin: ${subject.name}`);

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    logger.error('Delete subject (Super Admin) error:', error);
    next(error);
  }
};

exports.lookupPincode = async (req, res, next) => {
  try {
    const { pincode } = req.params;

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 6-digit pincode',
      });
    }

    const https = require('https');

    const data = await new Promise((resolve, reject) => {
      https.get(`https://api.postalpincode.in/pincode/${pincode}`, (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse pincode API response'));
          }
        });
        response.on('error', reject);
      }).on('error', reject);
    });

    if (!data || !data[0] || data[0].Status !== 'Success' || !data[0].PostOffice?.length) {
      return res.status(404).json({
        success: false,
        message: 'No details found for this pincode',
      });
    }

    const postOffices = data[0].PostOffice;
    const first = postOffices[0];

    // Return all place names + the common district/state/country
    const places = postOffices.map((po) => po.Name);

    res.status(200).json({
      success: true,
      data: {
        pincode,
        places,
        city: first.Block !== 'NA' ? first.Block : first.District,
        district: first.District,
        state: first.State,
        country: first.Country,
      },
    });
  } catch (error) {
    logger.error('Pincode lookup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lookup pincode. Please try again.',
    });
  }
};

exports.generateAICodingQuestion = async (req, res, next) => {
  try {
    const { topic, difficulty, language, visibleTestCaseCount, hiddenTestCaseCount, additionalInstructions } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required for AI question generation',
      });
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    const validLanguages = ['javascript', 'python', 'java', 'cpp', 'c'];

    const question = await generateCodingQuestion({
      topic: topic.trim(),
      difficulty: validDifficulties.includes(difficulty) ? difficulty : 'medium',
      language: validLanguages.includes(language) ? language : 'javascript',
      visibleTestCaseCount: Math.min(Math.max(Number(visibleTestCaseCount) || 2, 1), 10),
      hiddenTestCaseCount: Math.min(Math.max(Number(hiddenTestCaseCount) || 3, 1), 10),
      additionalInstructions: additionalInstructions || '',
    });

    logger.info(`AI coding question generated by ${req.user.email} for topic: "${topic}"`);

    res.status(200).json({
      success: true,
      message: 'Coding question generated successfully',
      data: question,
    });
  } catch (error) {
    logger.error('AI question generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate question. Please try again.',
    });
  }
};

// @desc    Generate AI questions of any type (MCQ, Descriptive, TrueFalse, Coding)
// @route   POST /api/superadmin/questions/generate-ai-multi
// @access  Private/SuperAdmin
exports.generateAIQuestions = async (req, res, next) => {
  try {
    const { topic, type = 'MCQ', difficulty = 'medium', count = 5, language = 'javascript', additionalInstructions = '', subjectId, examId } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic/Subject is required for AI question generation',
      });
    }

    const validTypes = ['MCQ', 'Descriptive', 'TrueFalse', 'Coding'];
    const qType = validTypes.includes(type) ? type : 'MCQ';

    const questions = await generateQuestion({
      topic: topic.trim(),
      type: qType,
      difficulty,
      count: Math.min(Math.max(Number(count) || 5, 1), 20),
      language,
      additionalInstructions: additionalInstructions || '',
    });

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
      const exam = await Exam.findById(examId);
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

    logger.info(`AI generated ${savedQuestions.length} ${qType} questions by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `${savedQuestions.length} ${qType} questions generated and saved`,
      count: savedQuestions.length,
      data: savedQuestions,
    });
  } catch (error) {
    logger.error('AI multi-type generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate questions. Please try again.',
    });
  }
};
