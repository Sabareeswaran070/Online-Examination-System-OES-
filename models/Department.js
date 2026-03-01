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
    defaultProctoringSettings: {
      enforceFullscreen: { type: Boolean, default: true },
      blockNotifications: { type: Boolean, default: false },
      tabSwitchingAllowed: { type: Boolean, default: true },
      maxTabSwitches: { type: Number, default: 3 },
      maxFullscreenExits: { type: Number, default: 2 },
      maxCopyPaste: { type: Number, default: 0 },
      actionOnLimit: { type: String, enum: ['warn', 'auto-submit', 'lock'], default: 'warn' },
      isLocked: {
        enforceFullscreen: { type: Boolean, default: false },
        blockNotifications: { type: Boolean, default: false },
        tabSwitchingAllowed: { type: Boolean, default: false },
      }
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique department within a college
departmentSchema.index({ collegeId: 1, departmentCode: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
