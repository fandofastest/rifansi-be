const mongoose = require("mongoose");
const { importExcelToSPK } = require("./importExcell.js");

async function main() {
  try {
    console.log("🚀 Memulai proses import...");

    console.log("🔌 Menghubungkan ke MongoDB...");
    await mongoose.connect("mongodb://admin:Palang66@129.150.60.112:27017/testingimport?authSource=admin", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ Terhubung ke MongoDB.");

    const filePath = process.argv[2];
    if (!filePath) {
      console.error("❌ Path file Excel tidak ditemukan.");
      console.error("Gunakan: node runImport.js ./SPKRIFANSI.xlsx");
      process.exit(1);
    }

    console.log(`📄 Membaca file: ${filePath}`);
    await importExcelToSPK(filePath);
    console.log("✅ Import selesai.");
  } catch (err) {
    console.error("❌ Terjadi kesalahan:");
    console.error(err);
  } finally {
    console.log("🔌 Menutup koneksi MongoDB...");
    await mongoose.disconnect();
    console.log("✅ Koneksi ditutup. Selesai.");
    process.exit();
  }
}

main();
