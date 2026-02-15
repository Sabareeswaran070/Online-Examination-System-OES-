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
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
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
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
collegeSchema.index({ status: 1 });

module.exports = mongoose.model('College', collegeSchema);
