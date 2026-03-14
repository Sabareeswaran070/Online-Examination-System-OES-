const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // Added jwt
const User = require('../models/User'); // Added User model
const MonitoringLog = require('../models/MonitoringLog');
const Result = require('../models/Result');
const logger = require('../config/logger');

let io;

const init = (server) => {
    io = socketIo(server, {
        cors: {
            origin: '*', // Adjust this in production
            methods: ['GET', 'POST'],
        },
    });

    // Socket Auth Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            if (user.status !== 'active') {
                return next(new Error('Authentication error: User inactive'));
            }

            // Attach user info to socket
            socket.userId = user._id.toString();
            socket.userEmail = user.email;
            socket.role = user.role;
            next();
        } catch (err) {
            logger.error('Socket Auth Middleware Error:', err);
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`New socket connection: ${socket.id}`);

        // Join room for a specific exam
        socket.on('join_exam', ({ examId, role, userId }) => {
            socket.join(`exam_${examId}`);
            socket.userId = userId;
            socket.examId = examId;
            socket.role = role;

            if (role === 'monitor') {
                socket.join(`exam_${examId}_monitors`);
                logger.info(`Monitor ${userId} joined exam ${examId}`);
            } else {
                socket.join(`exam_${examId}_students`);
                logger.info(`Student ${userId} joined exam ${examId}`);

                // Notify monitors that a student has joined/is active
                io.to(`exam_${examId}_monitors`).emit('student_status_change', {
                    userId,
                    status: 'active',
                    timestamp: new Date()
                });
            }
        });

        // Handle student activity/heartbeat
        socket.on('student_activity', async (data) => {
            const { examId, userId, eventType, description, metadata } = data;

            // Update lastActive in Result
            try {
                await Result.updateOne(
                    { examId, studentId: userId },
                    { $set: { lastActive: new Date() } }
                );

                // Log the activity
                if (eventType !== 'heartbeat') {
                    await MonitoringLog.create({
                        examId,
                        studentId: userId,
                        eventType,
                        description,
                        metadata
                    });
                }

                // Broadcast to monitors
                io.to(`exam_${examId}_monitors`).emit('student_alert', {
                    userId,
                    eventType,
                    description,
                    metadata,
                    timestamp: new Date()
                });

            } catch (error) {
                logger.error('Error handling student activity socket event:', error);
            }
        });

        // Handle student camera feed (snapshots)
        socket.on('student_feed', (data) => {
            const { examId, userId, snapshot } = data;
            // Broadcast the snapshot to all monitors of this exam
            io.to(`exam_${examId}_monitors`).emit('student_feed_update', {
                userId,
                snapshot,
                timestamp: new Date()
            });
        });

        socket.on('join_admin_lounge', () => {
            if (socket.role === 'superadmin' || socket.role === 'admin') {
                socket.join('admin_lounge');
                logger.info(`Admin ${socket.userId} joined admin lounge`);
            }
        });

        // Live Deletion Synchronization
        socket.on('start_live_deletion', (data) => {
            // data: { competitionId, title, startTime (server timestamp) }
            socket.to('admin_lounge').emit('live_deletion_sync', {
                type: 'start',
                ...data,
                adminEmail: socket.userEmail // If available
            });
        });

        socket.on('stop_live_deletion', (data) => {
            socket.to('admin_lounge').emit('live_deletion_sync', {
                type: 'stop',
                ...data
            });
        });

        socket.on('confirm_live_deletion', (data) => {
            socket.to('admin_lounge').emit('live_deletion_sync', {
                type: 'confirm',
                ...data
            });
        });

        socket.on('disconnect', () => {
            if (socket.role === 'student' && socket.userId && socket.examId) {
                io.to(`exam_${socket.examId}_monitors`).emit('student_status_change', {
                    userId: socket.userId,
                    status: 'disconnected',
                    timestamp: new Date()
                });
            }
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = {
    init,
    getIo,
};
