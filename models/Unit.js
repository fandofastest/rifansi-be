const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  }
}, {
  timestamps: true
});

// Indexes
unitSchema.index({ code: 1 }, { unique: true });
unitSchema.index({ name: 1 });

module.exports = mongoose.model('Unit', unitSchema); 