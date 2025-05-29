const mongoose = require('mongoose');

const overtimeRateSchema = new mongoose.Schema({
  waktuKerja: { type: Number, required: true },
  normal: { type: Number, required: true },
  weekend: { type: Number, required: true },
  libur: { type: Number, required: true }
}, { timestamps: true });

overtimeRateSchema.index({ waktuKerja: 1 }, { unique: true });

module.exports = mongoose.model('OvertimeRate', overtimeRateSchema); 