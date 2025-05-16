const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importExcelToSPK } = require('../scripts/importExcell');

// Konfigurasi multer untuk menyimpan file upload
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Cek dan buat direktori jika belum ada
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
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

// Endpoint untuk upload file excel SPK
router.post('/import-spk', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    }

    const filePath = req.file.path;
    console.log(`File berhasil diupload: ${filePath}`);

    // Jalankan import
    await importExcelToSPK(filePath);

    // Hapus file setelah diproses (opsional)
    // fs.unlinkSync(filePath);

    return res.status(200).json({ 
      success: true, 
      message: 'SPK berhasil diimport',
      file: req.file.originalname
    });
  } catch (error) {
    console.error('Error importing SPK:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal import SPK', 
      error: error.message 
    });
  }
});

// Endpoint untuk melihat status import terbaru (opsional)
router.get('/import-status', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Import ready', 
    lastImport: null
  });
});

module.exports = router; 