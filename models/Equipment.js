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
    type: String 
  },
  fuelType: { 
    type: String 
  }, // contoh: Solar, Bensin
  year: { 
    type: Number 
  }, // tahun produksi alat
  serviceStatus: { 
    type: String, 
    enum: ['Active', 'Maintenance', 'Decommissioned'], 
    default: 'Active' 
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
equipmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Equipment = mongoose.model('Equipment', equipmentSchema);
module.exports = Equipment; 