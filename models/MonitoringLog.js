const mongoose = require('mongoose');

const monitoringLogSchema = new mongoose.Schema(
    {
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        eventType: {
            type: String,
            required: true,
            enum: [
                'tab_switch',
                'fullscreen_exit',
                'copy_paste',
                'face_missing',
                'multiple_faces',
                'long_idle',
                'question_navigate',
                'answer_change',
                'heartbeat',
                'session_start',
                'session_end',
                'warning_received',
                'session_paused',
                'session_resumed',
                'time_extended'
            ],
        },
        description: {
            type: String,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast querying during monitoring and reports
monitoringLogSchema.index({ examId: 1, studentId: 1 });
monitoringLogSchema.index({ examId: 1, timestamp: -1 });

module.exports = mongoose.model('MonitoringLog', monitoringLogSchema);
