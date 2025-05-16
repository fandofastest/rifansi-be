const mongoose = require('mongoose');

const fuelPriceSchema = new mongoose.Schema({
  fuelType: { 
    type: String, 
    required: true 
  },
  pricePerLiter: { 
    type: Number, 
    required: true 
  },
  effectiveDate: { 
    type: Date, 
    required: true 
  },
  description: { 
    type: String 
  }
}, {
  timestamps: true
});

// Indexes
fuelPriceSchema.index({ fuelType: 1 });
fuelPriceSchema.index({ effectiveDate: -1 });

module.exports = mongoose.model('FuelPrice', fuelPriceSchema); 