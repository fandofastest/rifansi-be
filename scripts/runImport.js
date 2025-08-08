const mongoose = require("mongoose");
require('dotenv').config();
const {
  importExcelToSPK,
  importExcelWAPToSPK,
  testExtractWAPMetadata,
  displayBOQItems,
  importAndDisplayBOQItems,
  importCompleteWAPBOQ,
  importCompleteWapBoqv2,
  importCompleteWapBoqv3
} = require("./importExcell.js");

async function main() {
  try {
    console.log("🚀 Memulai proses import...");

    // Parse arguments
    const mode = process.argv[2]; // 'old', 'wap', 'test', 'boq', 'save-boq', atau 'complete'
    const filePath = process.argv[3];

    if (!mode || !filePath) {
      console.error("❌ Parameter tidak lengkap.");
      console.error("\n📋 CARA PENGGUNAAN:");
      console.error("node runImport.js <mode> <file_path>");
      console.error("\n🔧 MODE YANG TERSEDIA:");
      console.error("  old      - Import Excel format lama (1 sheet BOQ)");
      console.error("  wap      - Import Excel format WAP (2 sheet: WAP + BOQ)");
      console.error("  test     - Test ekstraksi metadata WAP (tidak save ke DB)");
      console.error("  boq      - Tampilkan semua item BOQ (tidak save ke DB)");
      console.error("  save-boq - Import BOQ ke database dan tampilkan hasil");
      console.error("  complete - Import lengkap WAP + BOQ sekaligus ⭐");
      console.error("  complete-v2 - Import lengkap WAP + BOQ (versi duplikat)");
      console.error("  complete-v3 - Import lengkap WAP + BOQ (deteksi otomatis format SPK) 🔄");
      console.error("\n💡 CONTOH:");
      console.error("  node runImport.js old ./SPKRIFANSI.xlsx");
      console.error("  node runImport.js wap ./WAP-BOQ-FILE.xlsx");
      console.error("  node runImport.js test ./WAP-BOQ-FILE.xlsx");
      console.error("  node runImport.js boq ./WAP-BOQ-FILE.xlsx");
      console.error("  node runImport.js save-boq ./WAP-BOQ-FILE.xlsx");
      console.error("  node runImport.js complete ./WAP-BOQ-FILE.xlsx  ⭐ REKOMENDASI");
      console.error("  node runImport.js complete-v2 ./WAP-BOQ-FILE.xlsx  (versi duplikat)");
      console.error("  node runImport.js complete-v3 ./WAP-BOQ-FILE.xlsx  (deteksi otomatis format) 🔄");
      process.exit(1);
    }

    console.log(`📄 File: ${filePath}`);
    console.log(`🎯 Mode: ${mode.toUpperCase()}`);

    // Mode yang tidak perlu koneksi database
    if (mode === 'test') {
      console.log("🧪 Mode TEST - Tidak memerlukan koneksi database");
      console.log("=".repeat(60));

      await testExtractWAPMetadata(filePath);

      console.log("\n✅ Test ekstraksi metadata selesai.");
      console.log("📝 Silakan periksa hasil di atas untuk memastikan data terbaca dengan benar.");
      console.log("💡 Jika sudah OK, jalankan dengan mode 'wap' untuk import ke database.");
      return;
    }

    if (mode === 'boq') {
      console.log("📋 Mode BOQ - Menampilkan semua item BOQ");
      console.log("=".repeat(60));

      await displayBOQItems(filePath);

      console.log("\n✅ Analisis BOQ selesai.");
      console.log("💡 Jika struktur sudah benar, jalankan dengan mode 'save-boq' untuk import ke database.");
      return;
    }

    // Untuk mode yang perlu koneksi database
    console.log("🔌 Menghubungkan ke MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ Terhubung ke MongoDB.");

    // Pilih fungsi berdasarkan mode
    switch (mode) {
      case 'old':
        console.log("📊 Menggunakan format LAMA (1 sheet BOQ)");
        await importExcelToSPK(filePath);
        break;

      case 'wap':
        console.log("📊 Menggunakan format WAP (2 sheet: WAP + BOQ)");
        await importExcelWAPToSPK(filePath);
        break;

      case 'save-boq':
        console.log("💾 Mode SAVE-BOQ - Import BOQ ke database dan tampilkan hasil");
        await importAndDisplayBOQItems(filePath);
        break;

      case 'complete':
        console.log("🎯 Mode COMPLETE - Import lengkap WAP + BOQ");
        await importCompleteWAPBOQ(filePath);
        break;

      case 'complete-v2':
        console.log("🎯 Mode COMPLETE-V2 - Import lengkap WAP + BOQ (versi 2)");
        await importCompleteWapBoqv2(filePath);
        break;

      case 'complete-v3':
        console.log("🎯 Mode COMPLETE-V3 - Import lengkap WAP + BOQ (deteksi otomatis format SPK)");
        await importCompleteWapBoqv3(filePath);
        break;

      default:
        throw new Error(`❌ Mode '${mode}' tidak dikenal. Gunakan: old, wap, test, boq, save-boq, complete, complete-v2, atau complete-v3`);
    }

    console.log("✅ Import selesai.");

  } catch (err) {
    console.error("❌ Terjadi kesalahan:");
    console.error(err.message);
    if (err.stack) {
      console.error("\n📋 Detail error:");
      console.error(err.stack);
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      console.log("🔌 Menutup koneksi MongoDB...");
      await mongoose.disconnect();
      console.log("✅ Koneksi ditutup.");
    }
    console.log("🏁 Selesai.");
    process.exit();
  }
}

main();
