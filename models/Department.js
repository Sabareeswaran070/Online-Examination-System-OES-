const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide department name'],
      trim: true,
    },
    departmentCode: {
      type: String,
      required: [true, 'Please provide department code'],
      uppercase: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: true,
    },
    deptHeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    description: {
      type: String,
    },
    establishedYear: {
      type: Number,
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    totalFaculty: {
      type: Number,
      default: 0,
    },
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
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

// Compound index to ensure unique department within a college
departmentSchema.index({ collegeId: 1, departmentCode: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
