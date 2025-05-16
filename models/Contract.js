const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  contractNo: { 
    type: String, 
    required: true, 
    unique: true 
  }, // contoh: SPHR00551A
  description: { 
    type: String 
  }, // keterangan bebas
  startDate: { 
    type: Date 
  }, // tanggal mulai kontrak
  endDate: { 
    type: Date 
  }, // tanggal selesai kontrak
  vendorName: { 
    type: String 
  }, // nama vendor atau supplier (optional)
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Contract = mongoose.model('Contract', contractSchema);
module.exports = Contract; 