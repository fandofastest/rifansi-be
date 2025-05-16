const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  unitId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Unit', 
    required: true 
  },
  unitRate: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String 
  }
}, {
  timestamps: true
});

// Indexes
materialSchema.index({ name: 1 });
materialSchema.index({ unitId: 1 });

module.exports = mongoose.model('Material', materialSchema); 