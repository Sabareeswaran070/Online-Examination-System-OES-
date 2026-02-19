const mongoose = require('mongoose');

const competitionCollegeSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: true,
    },
    // College admin's response
    collegeStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    collegeRespondedAt: {
      type: Date,
    },
    collegeRespondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    collegeRejectReason: {
      type: String,
    },
    // Super admin's approval for this college
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'not-approved'],
      default: 'pending',
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalNote: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one record per competition per college
competitionCollegeSchema.index({ competitionId: 1, collegeId: 1 }, { unique: true });
competitionCollegeSchema.index({ collegeId: 1, collegeStatus: 1 });
competitionCollegeSchema.index({ competitionId: 1, approvalStatus: 1 });

module.exports = mongoose.model('CompetitionCollege', competitionCollegeSchema);
