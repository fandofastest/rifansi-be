const mongoose = require('mongoose');

const manpowerLogSchema = new mongoose.Schema({
  dailyActivityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyActivity',
    required: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PersonnelRole',
    required: true,
    index: true
  },
  personCount: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  hourlyRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  workingHours: {
    type: Number,
    required: true,
    min: 0,
    default: 8
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

// Virtual field untuk total price
manpowerLogSchema.virtual('totalPrice').get(function () {
  return (this.personCount || 1) * (this.hourlyRate || 0) * (this.workingHours || 8);
});

// Indexes
manpowerLogSchema.index({ dailyActivityId: 1 });
manpowerLogSchema.index({ isActive: 1 });

// Middleware untuk memvalidasi role sebelum save
manpowerLogSchema.pre('save', async function (next) {
  if (this.isModified('role')) {
    const PersonnelRole = mongoose.model('PersonnelRole');
    const role = await PersonnelRole.findById(this.role);
    if (!role) {
      next(new Error('PersonnelRole not found'));
    }
  }
  next();
});

const ManpowerLog = mongoose.model('ManpowerLog', manpowerLogSchema);
module.exports = ManpowerLog; 