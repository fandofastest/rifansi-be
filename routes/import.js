const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  importExcelToSPK,
  importCompleteWAPBOQ,
  testExtractWAPMetadata,
  importAuto,
  importCompleteWapBoqv3
} = require('../scripts/importExcell');

// Konfigurasi multer untuk menyimpan file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');

    // Cek dan buat direktori jika belum ada
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'spk-' + uniqueSuffix + ext);
  }
});

// Filter file: hanya terima excel
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file Excel (.xlsx atau .xls) yang diizinkan'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

// Endpoint untuk upload file excel SPK format LAMA
router.post('/import-spk-old', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    }

    const filePath = req.file.path;
    console.log(`📥 File berhasil diupload (format lama): ${filePath}`);

    // Jalankan import format lama
    await importExcelToSPK(filePath);

    // Hapus file setelah diproses
    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      message: 'SPK format lama berhasil diimport',
      file: req.file.originalname,
      format: 'old'
    });
  } catch (error) {
    console.error('❌ Error importing SPK (old format):', error);

    // Hapus file jika ada error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal import SPK format lama',
      error: error.message
    });
  }
});

// Endpoint untuk upload file excel SPK format WAP (BARU - REKOMENDASI)
router.post('/import-spk', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    }

    const filePath = req.file.path;
    console.log(`📥 File berhasil diupload (multi-format SPK): ${filePath}`);

    // Jalankan import multi-format SPK (mendukung semua format SPK)
    const result = await importCompleteWapBoqv3(filePath);

    // Hapus file setelah diproses
    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      message: 'SPK berhasil diimport (multi-format)',
      file: req.file.originalname,
      format: 'auto',
      data: {
        spkId: result.spk._id,
        spkNo: result.spk.spkNo,
        wapNo: result.spk.wapNo,
        title: result.spk.title,
        budget: result.spk.budget,
        workItemsCount: result.spk.workItems.length,
        stats: result.stats
      }
    });
  } catch (error) {
    console.error('❌ Error importing SPK (WAP format):', error);

    // Hapus file jika ada error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal import SPK format WAP',
      error: error.message
    });
  }
});

// Endpoint untuk test ekstraksi metadata WAP (tanpa save ke database)
router.post('/test-wap', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    }

    const filePath = req.file.path;
    console.log(`📥 File berhasil diupload untuk test: ${filePath}`);

    // Test ekstraksi metadata saja
    const metadata = await testExtractWAPMetadata(filePath);

    // Hapus file setelah diproses
    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      message: 'Test ekstraksi metadata berhasil',
      file: req.file.originalname,
      metadata: metadata
    });
  } catch (error) {
    console.error('❌ Error testing WAP metadata:', error);

    // Hapus file jika ada error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal test ekstraksi metadata',
      error: error.message
    });
  }
});

// Endpoint untuk import dengan auto-detect format
router.post('/import-auto', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    }

    const filePath = req.file.path;
    console.log(`📥 File berhasil diupload (auto-detect): ${filePath}`);

    // Gunakan importAuto
    const result = await importAuto(filePath);

    // Hapus file setelah diproses
    fs.unlinkSync(filePath);

    // Response fleksibel tergantung hasil
    if (result && result.spk) {
      return res.status(200).json({
        success: true,
        message: 'SPK berhasil diimport (auto)',
        file: req.file.originalname,
        data: {
          spkId: result.spk._id,
          spkNo: result.spk.spkNo,
          wapNo: result.spk.wapNo,
          title: result.spk.title,
          budget: result.spk.budget,
          workItemsCount: result.spk.workItems.length,
          stats: result.stats
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'SPK berhasil diimport (auto)',
        file: req.file.originalname,
        data: result
      });
    }
  } catch (error) {
    console.error('❌ Error importing SPK (auto-detect):', error);

    // Hapus file jika ada error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal import SPK (auto-detect)',
      error: error.message
    });
  }
});

// Endpoint untuk melihat status import terbaru
router.get('/import-status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Import service ready',
    supportedFormats: ['old', 'wap'],
    endpoints: {
      '/import-spk': 'Import format WAP (rekomendasi)',
      '/import-spk-old': 'Import format lama',
      '/import-auto': 'Auto-detect format',
      '/test-wap': 'Test ekstraksi metadata WAP'
    }
  });
});

module.exports = router; 