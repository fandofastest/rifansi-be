const mongoose = require('mongoose');

const activityResourcePlanSchema = new mongoose.Schema({
  dailyActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyActivity', required: true },
  activityDetailId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityDetail', required: true },
  // Equipment Plan
  equipmentPlans: [{
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    plannedStartTime: { type: Date },
    plannedEndTime: { type: Date },
    plannedWorkingHours: { type: Number },
    initialFuelLevel: { type: Number },
    remarks: { type: String },
    // Tambahan field untuk tracking
    isAvailable: { type: Boolean, default: true },
    availabilityCheckedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    availabilityCheckedAt: { type: Date }
  }],
  // Manpower Plan
  manpowerPlans: [{
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonnelRole', required: true },
    quantity: { type: Number, required: true },
    plannedHours: { type: Number },
    remarks: { type: String },
    // Tambahan field untuk tracking
    isAvailable: { type: Boolean, default: true },
    availabilityCheckedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    availabilityCheckedAt: { type: Date }
  }],
  // Material Plan
  materialPlans: [{
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
    quantity: { type: Number, required: true },
    remarks: { type: String },
    // Tambahan field untuk tracking
    isAvailable: { type: Boolean, default: true },
    availabilityCheckedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    availabilityCheckedAt: { type: Date }
  }],
  // Tracking
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  // Tambahan field untuk validasi
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  // Tambahan field untuk tracking
  revisionHistory: [{
    type: String, // 'equipment', 'manpower', 'material'
    changes: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
activityResourcePlanSchema.index({ dailyActivityId: 1 });
activityResourcePlanSchema.index({ activityDetailId: 1 });
activityResourcePlanSchema.index({ isActive: 1 });
activityResourcePlanSchema.index({ isVerified: 1 });
activityResourcePlanSchema.index({ createdAt: -1 });

// Middleware untuk update timestamp
activityResourcePlanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ActivityResourcePlan = mongoose.model('ActivityResourcePlan', activityResourcePlanSchema);

module.exports = ActivityResourcePlan; 