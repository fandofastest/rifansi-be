const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  isNational: { 
    type: Boolean, 
    default: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { 
  timestamps: true 
});

// Indexes
holidaySchema.index({ date: 1 }, { unique: true });
holidaySchema.index({ isNational: 1 });

module.exports = mongoose.model('Holiday', holidaySchema); 