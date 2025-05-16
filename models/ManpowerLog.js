const mongoose = require('mongoose');

const manpowerLogSchema = new mongoose.Schema({
  dailyActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyActivity', required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonnelRole', required: true },
  personCount: { type: Number, required: true },
  normalHoursPerPerson: { type: Number, default: 0 },
  normalHourlyRate: { type: Number, required: true },
  overtimeHourlyRate: { type: Number, required: true }
});

// Indexes
manpowerLogSchema.index({ dailyActivityId: 1 });
manpowerLogSchema.index({ role: 1 });
manpowerLogSchema.index({ createdAt: -1 });

const ManpowerLog = mongoose.model('ManpowerLog', manpowerLogSchema);

module.exports = ManpowerLog; 