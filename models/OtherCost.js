const mongoose = require('mongoose');

const otherCostSchema = new mongoose.Schema({
  dailyActivityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DailyActivity', 
    required: true 
  },
  costType: {
    type: String,
    required: true,
    enum: [
      'Transportation', 
      'Accommodation', 
      'Administration', 
      'Tools', 
      'Communication',
      'Safety',
      'Maintenance',
      'Miscellaneous'
    ]
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String
  },
  receiptNumber: {
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
otherCostSchema.index({ dailyActivityId: 1 });
otherCostSchema.index({ costType: 1 });
otherCostSchema.index({ isActive: 1 });
otherCostSchema.index({ createdAt: 1 });

// Middleware untuk update timestamp
otherCostSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const OtherCost = mongoose.model('OtherCost', otherCostSchema);

module.exports = OtherCost; 