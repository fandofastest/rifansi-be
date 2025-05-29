const mongoose = require('mongoose');

const approverSettingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
approverSettingSchema.index({ userId: 1, approverId: 1 }, { unique: true });
approverSettingSchema.index({ userId: 1 });
approverSettingSchema.index({ approverId: 1 });

module.exports = mongoose.model('ApproverSetting', approverSettingSchema); 