const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
    rate: {
        type: Number,
        required: true
    },
    description: {
        type: String
    }
}, { _id: false });

const workItemSchema = new mongoose.Schema({
    workItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkItem',
        required: true
    },
    boqVolume: {
        type: {
            nr: {
                type: Number,
                required: true,
                default: 0
            },
            r: {
                type: Number,
                required: true,
                default: 0
            }
        },
        required: true,
        default: () => ({ nr: 0, r: 0 })
    },
    amount: {
        type: Number,
        default: function() {
            return (this.boqVolume.nr * this.rates.nr.rate) + 
                   (this.boqVolume.r * this.rates.r.rate);
        }
    },
    rates: {
        nr: rateSchema,
        r: rateSchema
    },
    description: {
        type: String,
        trim: true
    }
}, { _id: false });

const spkSchema = new mongoose.Schema({
    spkNo: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    contractNo: {
        type: String,
        trim: true
    },
    wapNo: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    projectName: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    contractor: {
        type: String,
        required: true,
        trim: true
    },
    workDescription: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area'
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    budget: {
        type: Number,
        required: true
    },
    workItems: [workItemSchema],
    status: {
        type: String,
        enum: ['draft', 'active', 'completed', 'cancelled', 'closed'],
        default: 'active',
        required: true
    }
}, {
    timestamps: true
});

// Middleware untuk update updatedAt dan contractNo jika kosong
spkSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Jika contractNo kosong, coba ekstrak dari contractor
  if (!this.contractNo && this.contractor) {
    // Pattern untuk nomor kontrak: biasanya di awal string seperti SPHR00551A
    const contractMatch = this.contractor.match(/^([A-Z0-9]+)\s*\[/);
    if (contractMatch && contractMatch[1]) {
      this.contractNo = contractMatch[1].trim();
    }
  }
  
  next();
});

// Method untuk mendapatkan contractNo
spkSchema.methods.getContractNo = function() {
  // Jika contractNo sudah ada, gunakan yang ada
  if (this.contractNo) {
    return this.contractNo;
  }
  
  // Jika tidak ada, coba ekstrak dari contractor
  if (this.contractor) {
    const contractMatch = this.contractor.match(/^([A-Z0-9]+)\s*\[/);
    if (contractMatch && contractMatch[1]) {
      return contractMatch[1].trim();
    }
  }
  
  return null;
};

// Extract contractNo function yang digunakan di beberapa tempat
const extractContractNo = function(contractor) {
  if (contractor) {
    const contractMatch = contractor.match(/^([A-Z0-9]+)\s*\[/);
    if (contractMatch && contractMatch[1]) {
      return contractMatch[1].trim();
    }
  }
  return null;
};

// Middleware yang dipanggil setiap kali document di-initialize dari database
spkSchema.post('init', function() {
  // Jika contractNo kosong, coba ekstrak dari contractor
  if (!this.contractNo && this.contractor) {
    const extractedNo = extractContractNo(this.contractor);
    if (extractedNo) {
      // Set contractNo tapi tidak perlu disimpan ke database
      // Ini hanya memperbarui objek di memory
      this.contractNo = extractedNo;
    }
  }
  
  // Jika status kosong atau null, set ke 'active'
  if (!this.status) {
    console.log(`[Pre-save middleware] SPK ${this._id} status kosong, diubah ke 'active'`);
    this.status = 'active';
  } else {
    console.log(`[Pre-save middleware] SPK ${this._id} status sudah ada: ${this.status}`);
  }
});

// Middleware untuk find dan findOne (saat mengambil data dengan query)
spkSchema.post(/^find/, function(docs) {
  // Jika hasil adalah array (dari find)
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (!doc.contractNo && doc.contractor) {
        doc.contractNo = extractContractNo(doc.contractor);
      }
      
      // Jika status kosong atau null, set ke 'active'
      if (!doc.status) {
        console.log(`[Post-find middleware] SPK array ${doc._id} status kosong, diubah ke 'active'`);
        doc.status = 'active';
      } else {
        console.log(`[Post-find middleware] SPK array ${doc._id} status sudah ada: ${doc.status}`);
      }
    });
  } 
  // Jika hasil adalah dokumen tunggal (dari findOne)
  else if (docs && !docs.contractNo && docs.contractor) {
    docs.contractNo = extractContractNo(docs.contractor);
    
    // Jika status kosong atau null, set ke 'active'
    if (!docs.status) {
      console.log(`[Post-find middleware] SPK single ${docs._id} status kosong, diubah ke 'active'`);
      docs.status = 'active';
    } else {
      console.log(`[Post-find middleware] SPK single ${docs._id} status sudah ada: ${docs.status}`);
    }
  }
});

// Indexes
spkSchema.index({ spkNo: 1 }, { unique: true });
spkSchema.index({ wapNo: 1 });
spkSchema.index({ projectName: 1 });
spkSchema.index({ date: -1 });
spkSchema.index({ contractor: 1 });
spkSchema.index({ location: 1 });
spkSchema.index({ startDate: 1 });
spkSchema.index({ endDate: 1 });
spkSchema.index({ 'workItems.workItemId': 1 });

const SPK = mongoose.model('SPK', spkSchema);

module.exports = SPK; 