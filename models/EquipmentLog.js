const mongoose = require('mongoose');

const equipmentLogSchema = new mongoose.Schema({
  dailyActivityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyActivity',
    required: true
  },
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  fuelIn: {
    type: Number,
    min: 0,
    default: 0
  },
  fuelRemaining: {
    type: Number,
    min: 0,
    default: 0
  },
  workingHour: {
    type: Number,
    min: 0,
    default: 0
  },
  hourlyRate: {
    type: Number,
    min: 0,
    default: 0
  },
  rentalRatePerDay: {
    type: Number,
    min: 0,
    default: 0
  },
  fuelPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  isBrokenReported: {
    type: Boolean,
    default: false
  },
  brokenDescription: {
    type: String
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
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field untuk total price
equipmentLogSchema.virtual('totalPrice').get(function () {
  // Hitung biaya bahan bakar
  const fuelCost = (this.fuelIn || 0) * (this.fuelPrice || 0);

  // Hitung biaya sewa per jam
  const rentalCost = (this.workingHour || 0) * (this.hourlyRate || 0);

  return fuelCost + rentalCost;
});

// Middleware untuk mengambil harga bahan bakar terakhir
equipmentLogSchema.pre('save', async function (next) {
  try {
    if (this.isNew || this.isModified('fuelIn')) {
      // Ambil data equipment untuk mendapatkan fuel type
      const Equipment = mongoose.model('Equipment');
      const equipment = await Equipment.findById(this.equipmentId);

      if (equipment && equipment.fuelType) {
        // Ambil harga bahan bakar terakhir berdasarkan fuel type
        const FuelPrice = mongoose.model('FuelPrice');
        const latestFuelPrice = await FuelPrice.findOne({
          fuelType: equipment.fuelType,
          effectiveDate: { $lte: new Date() }
        }).sort({ effectiveDate: -1 });

        if (latestFuelPrice) {
          this.fuelPrice = latestFuelPrice.pricePerLiter;
        }
      }
    }

    // Update timestamp
    this.updatedAt = new Date();
    next();
  } catch (error) {
    console.error('Error getting latest fuel price:', error);
    next(error);
  }
});

// Indexes
equipmentLogSchema.index({ dailyActivityId: 1 });
equipmentLogSchema.index({ equipmentId: 1 });
equipmentLogSchema.index({ isActive: 1 });
equipmentLogSchema.index({ createdAt: 1 });

const EquipmentLog = mongoose.model('EquipmentLog', equipmentLogSchema);

module.exports = EquipmentLog; 