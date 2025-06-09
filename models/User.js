const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  passwordHash: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PersonnelRole',
    required: true
  },
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10,13}$/, 'Please enter a valid phone number']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to check if user has a specific role code
userSchema.methods.hasRole = async function (roleCode) {
  await this.populate('role');
  return this.role && this.role.roleCode === roleCode;
};

// Method to check if user is superadmin
userSchema.methods.isSuperadmin = async function () {
  return this.hasRole('SUPERADMIN');
};

// Method to check if user is admin
userSchema.methods.isAdmin = async function () {
  const role = await this.populate('role').then(user => user.role.roleCode);
  return role === 'ADMIN' || role === 'SUPERADMIN';
};

// Method to check if user is mandor
userSchema.methods.isMandor = async function () {
  return this.hasRole('PMCOW');
};

// Method to check if user is supervisor
userSchema.methods.isSupervisor = async function () {
  return this.hasRole('SUPERVISOR');
};

// Method to check if user is regular user

// Virtual for password (not stored in DB)
userSchema.virtual('password')
  .set(function (password) {
    this.passwordHash = password;
  })
  .get(function () {
    return this.passwordHash;
  });

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ area: 1 });

module.exports = mongoose.model('User', userSchema); 