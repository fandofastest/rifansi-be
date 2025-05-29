const mongoose = require('mongoose');

const otherCostSchema = new mongoose.Schema({
  dailyActivityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyActivity',
    required: true
  },
  costType: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
otherCostSchema.index({ dailyActivityId: 1 });
otherCostSchema.index({ costType: 1 });
otherCostSchema.index({ isActive: 1 });
otherCostSchema.index({ createdAt: 1 });

const OtherCost = mongoose.model('OtherCost', otherCostSchema);

module.exports = OtherCost; 