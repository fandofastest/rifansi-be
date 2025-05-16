const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  code: { 
    type: String, 
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
categorySchema.index({ code: 1 }, { unique: true });
categorySchema.index({ name: 1 });

module.exports = mongoose.model('Category', categorySchema); 