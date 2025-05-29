const mongoose = require('mongoose');

const dailyActivitySchema = new mongoose.Schema({
  spkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SPK',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    required: true
  },
  weather: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['Draft', 'Submitted', 'Approved', 'Rejected'],
    default: 'Draft'
  },
  workStartTime: {
    type: String
  },
  workEndTime: {
    type: String
  },
  startImages: [{
    type: String
  }],
  finishImages: [{
    type: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  closingRemarks: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Tambahan field untuk validasi dan tracking
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  approvalHistory: [{
    status: String,
    remarks: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
  }],
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
dailyActivitySchema.index({ spkId: 1 });
dailyActivitySchema.index({ date: 1 });
dailyActivitySchema.index({ areaId: 1 });
dailyActivitySchema.index({ createdBy: 1 });
dailyActivitySchema.index({ isActive: 1 });
dailyActivitySchema.index({ isApproved: 1 });

// Middleware untuk update timestamp
dailyActivitySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const DailyActivity = mongoose.model('DailyActivity', dailyActivitySchema);

module.exports = DailyActivity; 