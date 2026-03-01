const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema(
  {
    collegeName: {
      type: String,
      required: [true, 'Please provide college name'],
      trim: true,
      unique: true,
    },
    collegeCode: {
      type: String,
      required: [true, 'Please provide college code'],
      unique: true,
      uppercase: true,
    },
    address: {
      street: String,
      city: { type: String, required: true },
      district: String,
      state: { type: String, required: true },
      zipCode: String,
      country: { type: String, default: 'India' },
    },
    adminIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    departments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    establishedYear: {
      type: Number,
    },
    contactEmail: {
      type: String,
    },
    contactPhone: {
      type: String,
    },
    website: {
      type: String,
    },
    logo: {
      type: String,
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    totalFaculty: {
      type: Number,
      default: 0,
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

// Index for faster queries
collegeSchema.index({ status: 1 });

module.exports = mongoose.model('College', collegeSchema);
