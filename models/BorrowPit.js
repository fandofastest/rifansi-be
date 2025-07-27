const mongoose = require('mongoose');

const borrowPitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  // Optional descriptive location text
  locationName: {
    type: String,
    trim: true
  },
  // GeoJSON Point representing borrow pit coordinates
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 &&
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates. Longitude between -180 and 180, latitude between -90 and 90'
      }
    }
  }
}, {
  timestamps: true
});

// 2dsphere index for spatial queries
borrowPitSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('BorrowPit', borrowPitSchema);
