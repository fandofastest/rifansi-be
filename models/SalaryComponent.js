const mongoose = require('mongoose');

const salaryComponentSchema = new mongoose.Schema({
  personnelRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PersonnelRole',
    required: true
  },
  // 5 input dasar
  gajiPokok: {
    type: Number,
    default: 0
  },
  tunjanganTetap: {
    type: Number,
    default: 0
  },
  tunjanganTidakTetap: {
    type: Number,
    default: 0
  },
  transport: {
    type: Number,
    default: 0
  },
  pulsa: {
    type: Number,
    default: 0
  },
  // Persentase untuk perhitungan BPJS
  // Nilai default disesuaikan berdasarkan contoh data:
  // - gajiPokok: 4000000
  // - tunjanganTetap: 500000
  // Total penghasilan tetap: 4500000
  persentaseBpjsKT: {
    type: Number,
    default: 5.74  // 40050 / 4500000 * 100 = 0.89%
  },
  persentaseBpjsJP: {
    type: Number,
    default: 2.00  // 78300 / 4500000 * 100 = 1.74%
  },
  persentaseBpjsKES: {
    type: Number,
    default: 4.00  // 45000 / 4500000 * 100 = 1.00%
  },
  // Field untuk perhitungan lain jika diperlukan
  persentaseTHR: {
    type: Number,
    default: 8.33  // 374850 / 4500000 * 100 ≈ 8.33%
  },
  persentaseUangCuti: {
    type: Number,
    default: 4.17  // 187650 / 4500000 * 100 ≈ 4.17%
  },
  persentaseSantunan: {
    type: Number,
    default: 2.00  // 90000 / 4500000 * 100 = 2.00%
  }
}, { timestamps: true });

salaryComponentSchema.index({ personnelRole: 1 }, { unique: true });

// Fungsi untuk menghitung hari dalam bulan berdasarkan tanggal
salaryComponentSchema.statics.hitungHariPerBulan = function(date) {
  const tanggal = date ? new Date(date) : new Date();
  const tahun = tanggal.getFullYear();
  const bulan = tanggal.getMonth() + 1;
  return new Date(tahun, bulan, 0).getDate();
};

// Fungsi untuk menghitung komponen gaji yang tidak disimpan
salaryComponentSchema.methods.hitungKomponenGaji = function(date) {
  const model = this.constructor;
  const hariPerBulan = model.hitungHariPerBulan(date);
  
  // Hitung penghasilan tetap (gajiPokok + tunjanganTetap)
  const penghasilanTetap = this.gajiPokok + this.tunjanganTetap;
  
  // Hitung komponen BPJS berdasarkan penghasilan tetap
  const bpjsKT = Math.round(this.gajiPokok  * (this.persentaseBpjsKT / 100));
  const bpjsJP = Math.round(this.gajiPokok  * (this.persentaseBpjsJP / 100));
  const bpjsKES = Math.round(this.gajiPokok  * (this.persentaseBpjsKES / 100));
  
  // Hitung komponen lainnya berdasarkan rumus (gajiPokok+tunjanganTetap)/12
  const pembagianBulanan = Math.round(penghasilanTetap / 12);
  const uangCuti = Math.round(pembagianBulanan ); // Setengah dari pembagian bulanan
  const thr = pembagianBulanan; // Pembagian bulanan penuh
  const santunan = pembagianBulanan; // Sama dengan pembagian bulanan
  
  // Subtotal penghasilan tetap
  const subTotalPenghasilanTetap = 
    penghasilanTetap + 
    this.tunjanganTidakTetap + 
    this.transport + 
    this.pulsa + 
    bpjsKT + 
    bpjsJP + 
    bpjsKES + 
    uangCuti + 
    thr + 
    santunan;
  
  // Biaya Manpower harian
  const biayaMPTetapHarian = Math.round(subTotalPenghasilanTetap / hariPerBulan);
  
  // Upah lembur harian (1.5 x biaya manpower harian)
  const upahLemburHarian = Math.round(biayaMPTetapHarian * 1.5);
  
  // Biaya manpower harian total (biaya tetap + lembur harian)
  const biayaManpowerHarian = biayaMPTetapHarian + upahLemburHarian;
  
  return {
    gajiPokok: this.gajiPokok,
    tunjanganTetap: this.tunjanganTetap,
    tunjanganTidakTetap: this.tunjanganTidakTetap,
    transport: this.transport,
    pulsa: this.pulsa,
    bpjsKT,
    bpjsJP,
    bpjsKES,
    uangCuti,
    thr,
    santunan,
    hariPerBulan,
    subTotalPenghasilanTetap,
    biayaMPTetapHarian,
    upahLemburHarian,
    biayaManpowerHarian
  };
};

module.exports = mongoose.model('SalaryComponent', salaryComponentSchema); 