const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  equipmentCode: {
    type: String,
    required: true
  }, // RDP-xxx atau ID internal alat
  plateOrSerialNo: {
    type: String
  }, // No Polisi atau Serial Number
  equipmentType: {
    type: String,
    required: true
  }, // Bulldozer, Excavator, dll
  defaultOperator: {
    type: String
  },
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area'
  },
  year: {
    type: Number
  }, // tahun produksi alat
  serviceStatus: {
    type: String,
    enum: {
      values: ['ACTIVE', 'MAINTENANCE', 'REPAIR', 'INACTIVE', 'Active', 'Maintenance', 'Repair', 'Inactive'],
      message: '{VALUE} bukan status servis yang valid'
    },
    default: 'ACTIVE'
  },
  contracts: [{
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      required: true
    },
    equipmentId: {
      type: Number,
      required: true
    },
    rentalRate: {
      type: Number,
      required: true
    }
  }],
  description: {
    type: String
  },
  // Riwayat perpindahan area
  areaHistory: [{
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area',
      required: true
    },
    remarks: {
      type: String
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Riwayat status servis
  serviceHistory: [{
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'MAINTENANCE', 'REPAIR', 'INACTIVE', 'Active', 'Maintenance', 'Repair', 'Inactive'],
        message: '{VALUE} bukan status servis yang valid'
      },
      required: true
    },
    remarks: {
      type: String
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware untuk update updatedAt
equipmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware untuk memastikan serviceStatus selalu uppercase
equipmentSchema.pre('save', function (next) {
  if (this.serviceStatus) {
    this.serviceStatus = this.serviceStatus.toUpperCase();
  }
  if (this.serviceHistory && this.serviceHistory.length > 0) {
    this.serviceHistory.forEach(history => {
      if (history.status) {
        history.status = history.status.toUpperCase();
      }
    });
  }
  next();
});

// Index untuk area dan serviceStatus
equipmentSchema.index({ area: 1 });
equipmentSchema.index({ serviceStatus: 1 });

const Equipment = mongoose.model('Equipment', equipmentSchema);
module.exports = Equipment;