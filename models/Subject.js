const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide subject name'],
      trim: true,
    },
    subjectCode: {
      type: String,
      required: [true, 'Please provide subject code'],
      uppercase: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: true,
    },
    assignedFaculty: [
      {
        facultyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        assignedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    credits: {
      type: Number,
      default: 3,
    },
    semester: {
      type: Number,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index
subjectSchema.index({ departmentId: 1, subjectCode: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
