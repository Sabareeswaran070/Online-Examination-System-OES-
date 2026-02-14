const mongoose = require('mongoose');

const questionSetSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a folder name'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        facultyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for performance
questionSetSchema.index({ facultyId: 1, name: 1 });

module.exports = mongoose.model('QuestionSet', questionSetSchema);
