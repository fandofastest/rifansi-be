const mongoose = require('mongoose');

const dailyActivitySchema = new mongoose.Schema({
  spkId: { type: mongoose.Schema.Types.ObjectId, ref: 'SPK', required: true },
  date: { type: Date, required: true },
  location: { type: String },
  weather: { type: String },
  status: { 
    type: String, 
    enum: ['Planning', 'Working', 'Finalizing', 'Submitted'], 
    default: 'Planning' 
  },
  workStartTime: { type: Date },
  workEndTime: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  closingRemarks: { type: String },
  // Tambahan field untuk tracking
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  // Tambahan field untuk validasi dan tracking
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  revisionHistory: [{
    status: String,
    remarks: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
dailyActivitySchema.index({ spkId: 1 });
dailyActivitySchema.index({ date: -1 });
dailyActivitySchema.index({ status: 1 });
dailyActivitySchema.index({ createdBy: 1 });
dailyActivitySchema.index({ isActive: 1 });
dailyActivitySchema.index({ isApproved: 1 });

// Middleware untuk update timestamp
dailyActivitySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const DailyActivity = mongoose.model('DailyActivity', dailyActivitySchema);

module.exports = DailyActivity; 