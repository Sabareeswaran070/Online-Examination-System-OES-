const mongoose = require('mongoose');

const competitionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide competition title'],
      trim: true,
    },
    description: {
      type: String,
    },
    startTime: {
      type: Date,
      required: [true, 'Please provide start time'],
    },
    endTime: {
      type: Date,
      required: [true, 'Please provide end time'],
    },
    duration: {
      type: Number, // Duration in minutes
      required: [true, 'Please provide duration'],
    },
    totalMarks: {
      type: Number,
      required: [true, 'Please provide total marks'],
    },
    passingMarks: {
      type: Number,
      required: true,
    },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
        order: Number,
      },
    ],
    instructions: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'published', 'approved', 'live', 'completed', 'cancelled'],
      default: 'pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    liveAt: {
      type: Date,
    },
    totalAttempts: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

competitionSchema.index({ status: 1 });
competitionSchema.index({ createdBy: 1 });
competitionSchema.index({ startTime: 1, endTime: 1 });

module.exports = mongoose.model('Competition', competitionSchema);
