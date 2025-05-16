const mongoose = require('mongoose');

const equipmentLogSchema = new mongoose.Schema({
  dailyActivityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DailyActivity', 
    required: true 
  },
  equipmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Equipment', 
    required: true 
  },
  fuelIn: { 
    type: Number,
    min: 0
  },
  fuelRemaining: { 
    type: Number,
    min: 0
  },
  workingHour: { 
    type: Number,
    min: 0
  },
  fuelPrice: {
    type: Number,
    min: 0
  },
  isBrokenReported: { 
    type: Boolean, 
    default: false 
  },
  brokenDescription: {
    type: String
  },
  remarks: { 
    type: String 
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
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
equipmentLogSchema.index({ dailyActivityId: 1 });
equipmentLogSchema.index({ equipmentId: 1 });
equipmentLogSchema.index({ isActive: 1 });
equipmentLogSchema.index({ createdAt: 1 });

// Middleware untuk update timestamp
equipmentLogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const EquipmentLog = mongoose.model('EquipmentLog', equipmentLogSchema);

module.exports = EquipmentLog; 