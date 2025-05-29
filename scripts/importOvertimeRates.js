const mongoose = require('mongoose');
const { OvertimeRate } = require('../models');
require('dotenv').config();

// Data dari tabel yang diberikan
const overtimeRatesData = [
  { waktuKerja: 5, no: 2, normal: 0, weekend: 0, libur: 10 },
  { waktuKerja: 6, no: 3, normal: 0, weekend: 1.5, libur: 12 },
  { waktuKerja: 7, no: 4, normal: 0, weekend: 3.5, libur: 14 },
  { waktuKerja: 8, no: 5, normal: 1.5, weekend: 5.5, libur: 17 },
  { waktuKerja: 9, no: 6, normal: 3.5, weekend: 7.5, libur: 21 },
  { waktuKerja: 10, no: 7, normal: 5.5, weekend: 9.5, libur: 25 },
  { waktuKerja: 11, no: 8, normal: 7.5, weekend: 11.5, libur: 29 },
  { waktuKerja: 12, no: 9, normal: 9.5, weekend: 13.5, libur: 33 }
];

async function importOvertimeRates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Hapus semua data yang ada untuk menghindari duplikasi
    await OvertimeRate.deleteMany({});
    console.log('Existing overtime rates data cleared');
    
    // Import data baru
    const results = await Promise.all(
      overtimeRatesData.map(async (data) => {
        try {
          const overtimeRate = new OvertimeRate({
            waktuKerja: data.waktuKerja,
            normal: data.normal,
            weekend: data.weekend,
            libur: data.libur
          });
          
          await overtimeRate.save();
          console.log(`Imported: Waktu Kerja ${data.waktuKerja} jam`);
          return { success: true, data };
        } catch (error) {
          console.error(`Error importing Waktu Kerja ${data.waktuKerja} jam:`, error.message);
          return { success: false, data, error: error.message };
        }
      })
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Import completed: ${successful} successful, ${failed} failed`);
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    // Tutup koneksi database
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Jalankan fungsi import
importOvertimeRates()
  .then(() => {
    console.log('Import script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Import script failed:', error);
    process.exit(1);
  }); 