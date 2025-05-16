const mongoose = require('mongoose');

const activityDetailSchema = new mongoose.Schema({
  dailyActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyActivity', required: true },
  workItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkItem', required: true },
  // Execution phase
  actualQuantity: {
    nr: { type: Number, required: true, min: 0 },
    r: { type: Number, required: true, min: 0 }
  },
  actualStartTime: { type: Date },
  actualEndTime: { type: Date },
  status: { 
    type: String, 
    enum: ['Not Started', 'In Progress', 'Completed', 'Delayed'],
    default: 'Not Started'
  },
  remarks: { type: String },
  issues: { type: String },
  // Tambahan field untuk tracking
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  // Tambahan field untuk validasi
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  // Tambahan field untuk progress tracking
  progressPercentage: { type: Number, default: 0 },
  delayReason: { type: String },
  delayDuration: { type: Number }, // dalam menit
  revisionHistory: [{
    status: String,
    remarks: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Indexes
activityDetailSchema.index({ dailyActivityId: 1 });
activityDetailSchema.index({ workItemId: 1 });
activityDetailSchema.index({ status: 1 });
activityDetailSchema.index({ isActive: 1 });
activityDetailSchema.index({ isVerified: 1 });
activityDetailSchema.index({ createdAt: -1 });

// Middleware untuk update timestamp
activityDetailSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ActivityDetail = mongoose.model('ActivityDetail', activityDetailSchema);

module.exports = ActivityDetail; 