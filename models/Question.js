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
    isActive: {
      type: Boolean,
      default: true,
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
