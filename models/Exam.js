const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide exam title'],
      trim: true,
    },
    description: {
      type: String,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
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
      required: [true, 'Please provide exam duration'],
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
    examType: {
      type: String,
      enum: ['regular', 'quiz', 'midterm', 'final', 'practice', 'competition'],
      default: 'regular',
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
    },
    isRandomized: {
      type: Boolean,
      default: false, // Randomize question order for each student
    },
    allowReview: {
      type: Boolean,
      default: true, // Allow students to review answers after exam
    },
    showResultsImmediately: {
      type: Boolean,
      default: false,
    },
    negativeMarkingEnabled: {
      type: Boolean,
      default: false,
    },
    proctoring: {
      enabled: {
        type: Boolean,
        default: false,
      },
      webcamRequired: Boolean,
      tabSwitchingAllowed: Boolean,
      maxTabSwitches: Number,
    },
    allowedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
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
    contributingColleges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
examSchema.index({ facultyId: 1, status: 1 });
examSchema.index({ departmentId: 1, startTime: 1 });
examSchema.index({ status: 1, startTime: 1 });

// Virtual for checking if exam is active
examSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.startTime <= now && this.endTime >= now && this.status === 'ongoing';
});

module.exports = mongoose.model('Exam', examSchema);
