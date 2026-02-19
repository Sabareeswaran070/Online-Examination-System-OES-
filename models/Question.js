const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Please provide question text'],
    },
    type: {
      type: String,
      enum: ['MCQ', 'Descriptive', 'TrueFalse', 'Coding'],
      required: true,
    },
    options: [
      {
        text: String,
        isCorrect: {
          type: Boolean,
          default: false,
        },
      },
    ],
    correctAnswer: {
      type: String, // For descriptive questions
    },
    marks: {
      type: Number,
      required: [true, 'Please provide marks'],
      min: 0,
    },
    negativeMarks: {
      type: Number,
      default: 0,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    questionSet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionSet',
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    tags: [String],
    explanation: {
      type: String, // Explanation for correct answer
    },
    imageUrl: {
      type: String,
    },
    codeSnippet: {
      type: String, // For coding questions
    },
    programmingLanguage: {
      type: String, // For coding questions
    },
    testCases: [
      {
        input: String,
        expectedOutput: String,
      },
    ],
    // Enhanced Coding Question Fields
    inputFormat: {
      type: String,
    },
    outputFormat: {
      type: String,
    },
    constraints: {
      type: String,
    },
    visibleTestCases: [
      {
        input: String,
        expectedOutput: String,
        explanation: String,
      },
    ],
    hiddenTestCases: [
      {
        input: String,
        expectedOutput: String,
      },
    ],
    timeLimit: {
      type: Number, // in milliseconds
      default: 1000,
    },
    memoryLimit: {
      type: Number, // in MB
      default: 256,
    },
    starterCode: {
      type: String,
    },
    sampleInput: {
      type: String,
    },
    sampleOutput: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
questionSchema.index({ facultyId: 1, type: 1 });
questionSchema.index({ subject: 1 });
questionSchema.index({ difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema);
