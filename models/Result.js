const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
        },
        selectedAnswer: String, // For MCQ/TrueFalse
        textAnswer: String, // For Descriptive
        codeAnswer: String, // For Coding
        isCorrect: Boolean,
        marksAwarded: Number,
        timeTaken: Number, // Time taken for this question in seconds
        isEvaluated: {
          type: Boolean,
          default: false,
        },
        evaluatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        evaluatedAt: Date,
        feedback: String,
      },
    ],
    score: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'evaluated', 'pending-evaluation', 'locked'],
      default: 'in-progress',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    totalTimeTaken: {
      type: Number, // Total time in minutes
    },
    isPassed: {
      type: Boolean,
    },
    remarks: {
      type: String,
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    fullscreenExitCount: {
      type: Number,
      default: 0,
    },
    copyPasteCount: {
      type: Number,
      default: 0,
    },
    violations: [
      {
        type: {
          type: String,
          enum: ['tab_switch', 'tab-switch', 'copy_paste', 'copy-paste', 'fullscreen_exit', 'fullscreen-exit'],
        },
        timestamp: Date,
        description: String,
      },
    ],
    autoSubmitted: {
      type: Boolean,
      default: false, // True if submitted automatically on timeout
    },
    unlockRequest: {
      isRequested: { type: Boolean, default: false },
      reason: { type: String },
      requestedAt: { type: Date },
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
      }
    }
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one result per student per exam
resultSchema.index({ studentId: 1, examId: 1 }, { unique: true });
resultSchema.index({ examId: 1, score: -1 }); // For leaderboard

// Calculate percentage before saving
resultSchema.pre('save', async function (next) {
  if (this.isModified('score')) {
    const Exam = mongoose.model('Exam');
    const exam = await Exam.findById(this.examId);
    if (exam) {
      this.percentage = (this.score / exam.totalMarks) * 100;
      this.isPassed = this.score >= exam.passingMarks;
    }
  }
  next();
});

module.exports = mongoose.model('Result', resultSchema);
