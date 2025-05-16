const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  categoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
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
subCategorySchema.index({ categoryId: 1 });
subCategorySchema.index({ name: 1 });

module.exports = mongoose.model('SubCategory', subCategorySchema); 