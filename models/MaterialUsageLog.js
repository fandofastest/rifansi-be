const mongoose = require('mongoose');

const materialUsageLogSchema = new mongoose.Schema({
  dailyActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyActivity', required: true },
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
  quantity: { type: Number },
  unitRate: { type: Number },
  remarks: { type: String }
});

// Indexes
materialUsageLogSchema.index({ dailyActivityId: 1 });
materialUsageLogSchema.index({ materialId: 1 });

const MaterialUsageLog = mongoose.model('MaterialUsageLog', materialUsageLogSchema);

module.exports = MaterialUsageLog; 