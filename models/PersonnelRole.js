const mongoose = require('mongoose');

const personnelRoleSchema = new mongoose.Schema({
  roleCode: {
    type: String,
    required: true
  },
  roleName: {
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
personnelRoleSchema.index({ roleCode: 1 }, { unique: true });
personnelRoleSchema.index({ roleName: 1 });

module.exports = mongoose.model('PersonnelRole', personnelRoleSchema); 