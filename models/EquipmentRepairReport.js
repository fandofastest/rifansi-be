const mongoose = require('mongoose');

const equipmentRepairReportSchema = new mongoose.Schema({
  reportNumber: {
    type: String,
    unique: true
  }, // Format: RPR-YYYY-MM-DD-XXX
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }, // Mandor yang melaporkan
  reportDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  problemDescription: {
    type: String,
    required: true
  },
  damageLevel: {
    type: String,
    enum: ['RINGAN', 'SEDANG', 'BERAT', 'TOTAL'],
    required: true
  },
  reportImages: [{
    type: String // URL/path ke gambar
  }],
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    required: true
  },
  immediateAction: {
    type: String // Tindakan segera yang dilakukan mandor
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'IN_REPAIR', 'COMPLETED'],
    default: 'PENDING'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  
  // Approval Process
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin yang mereview
  },
  reviewDate: {
    type: Date
  },
  reviewNotes: {
    type: String
  },
  rejectionReason: {
    type: String
  },
  
  // Repair Process
  assignedTechnician: {
    type: String
  },
  estimatedCost: {
    type: Number,
    min: 0
  },
  actualCost: {
    type: Number,
    min: 0
  },
  repairStartDate: {
    type: Date
  },
  repairCompletionDate: {
    type: Date
  },
  repairNotes: {
    type: String
  },
  repairImages: [{
    type: String // URL/path ke gambar setelah perbaikan
  }],
  
  // Status History
  statusHistory: [{
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'IN_REPAIR', 'COMPLETED'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String
    }
  }],
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate report number
equipmentRepairReportSchema.pre('save', async function(next) {
  if (this.isNew && !this.reportNumber) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Hitung dokumen yang dibuat hari ini
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const count = await this.constructor.countDocuments({
        reportDate: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      });
      
      this.reportNumber = `RPR-${dateStr}-${String(count + 1).padStart(3, '0')}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Validate report number exists before save
equipmentRepairReportSchema.pre('validate', async function(next) {
  if (this.isNew && !this.reportNumber) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Hitung dokumen yang dibuat hari ini
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const count = await this.constructor.countDocuments({
        reportDate: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      });
      
      this.reportNumber = `RPR-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Middleware untuk menambah status history
equipmentRepairReportSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    // Tentukan siapa yang mengubah status
    const changedBy = this.reviewedBy || this.reportedBy;
    
    if (changedBy) {
      this.statusHistory.push({
        status: this.status,
        changedBy: changedBy,
        changedAt: new Date(),
        notes: this.reviewNotes || ''
      });
    }
  }
  next();
});

// Indexes
equipmentRepairReportSchema.index({ equipmentId: 1 });
equipmentRepairReportSchema.index({ reportedBy: 1 });
equipmentRepairReportSchema.index({ status: 1 });
equipmentRepairReportSchema.index({ reportDate: -1 });
equipmentRepairReportSchema.index({ reportNumber: 1 }, { unique: true });

const EquipmentRepairReport = mongoose.model('EquipmentRepairReport', equipmentRepairReportSchema);

module.exports = EquipmentRepairReport; 