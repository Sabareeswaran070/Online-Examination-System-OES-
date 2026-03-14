const MonitoringLog = require('../models/MonitoringLog');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const User = require('../models/User');
const logger = require('../config/logger');

// @desc    Get live monitoring stats for an exam
// @route   GET /api/monitoring/exams/:id/stats
// @access  Private (Admin, DeptHead, Faculty)
exports.getExamMonitoringStats = async (req, res, next) => {
    try {
        const examId = req.params.id;

        // Check if exam exists
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        // Get all results for this exam to see student statuses
        const results = await Result.find({ examId })
            .populate('studentId', 'name email regNo profileImage')
            .lean();

        const now = new Date();
        const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

        const students = results.map(r => {
            const lastActive = r.lastActive || r.updatedAt;
            const isIdle = (now - lastActive) > IDLE_THRESHOLD;
            const isDisconnected = (now - lastActive) > (10 * 60 * 1000); // 10 minutes fallback

            let status = 'active';
            if (r.status === 'locked') status = 'locked';
            else if (r.status === 'submitted') status = 'submitted';
            else if (isDisconnected) status = 'disconnected';
            else if (isIdle) status = 'idle';

            const suspiciousCount = r.violations.length;
            if (status === 'active' && suspiciousCount > 0) status = 'suspicious';

            return {
                _id: r.studentId._id,
                name: r.studentId.name,
                regNo: r.studentId.regNo,
                profileImage: r.studentId.profileImage,
                status,
                lastActive,
                violationCount: suspiciousCount,
                tabSwitchCount: r.tabSwitchCount,
                fullscreenExitCount: r.fullscreenExitCount,
                locked: r.status === 'locked'
            };
        });

        // Summary stats
        const stats = {
            total: students.length,
            active: students.filter(s => s.status === 'active' || s.status === 'suspicious').length,
            idle: students.filter(s => s.status === 'idle').length,
            suspicious: students.filter(s => s.status === 'suspicious' || s.violationCount > 3).length,
            disconnected: students.filter(s => s.status === 'disconnected').length,
            locked: students.filter(s => s.status === 'locked').length,
            submitted: students.filter(s => s.status === 'submitted').length,
        };

        res.status(200).json({
            success: true,
            data: {
                stats,
                students
            }
        });
    } catch (error) {
        logger.error('Get monitoring stats error:', error);
        next(error);
    }
};

// @desc    Get detailed activity log for a student in an exam
// @route   GET /api/monitoring/exams/:examId/students/:studentId/log
// @access  Private
exports.getStudentActivityLog = async (req, res, next) => {
    try {
        const { examId, studentId } = req.params;

        const logs = await MonitoringLog.find({ examId, studentId })
            .sort({ timestamp: -1 })
            .lean();

        const result = await Result.findOne({ examId, studentId })
            .populate('studentId', 'name email regNo')
            .lean();

        res.status(200).json({
            success: true,
            data: {
                student: result.studentId,
                violations: result.violations,
                logs
            }
        });
    } catch (error) {
        logger.error('Get student log error:', error);
        next(error);
    }
};

// @desc    Generate post-exam monitoring report
// @route   GET /api/monitoring/exams/:id/report
// @access  Private
exports.getMonitoringReport = async (req, res, next) => {
    try {
        const examId = req.params.id;

        // Aggregate report data
        const results = await Result.find({ examId })
            .populate('studentId', 'name regNo')
            .lean();

        const reportData = results.map(r => ({
            student: r.studentId.name,
            regNo: r.studentId.regNo,
            score: r.score,
            status: r.status,
            violationsCount: r.violations.length,
            violations: r.violations,
            tabSwitches: r.tabSwitchCount,
            fullscreenExits: r.fullscreenExitCount,
            timeTaken: r.totalTimeTaken,
            submittedAt: r.submittedAt
        }));

        res.status(200).json({
            success: true,
            data: reportData
        });
    } catch (error) {
        logger.error('Get monitoring report error:', error);
        next(error);
    }
};
