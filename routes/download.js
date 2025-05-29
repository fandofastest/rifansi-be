const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware untuk memeriksa autentikasi
const isAuthenticated = (req, res, next) => {
    try {
        // Get the user token from the headers
        const token = req.headers.authorization || '';

        if (!token) {
            return res.status(401).json({ error: 'Token tidak ditemukan' });
        }

        // Verify token
        const user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ error: 'Token tidak valid' });
    }
};

// Endpoint untuk mengunduh file
router.get('/:filePath(*)', isAuthenticated, (req, res) => {
    try {
        const filePath = decodeURIComponent(req.params.filePath)
            .replace(/\\/g, '/'); // Normalisasi path untuk menghindari backslash

        // Pastikan path dimulai dengan 'backups/'
        if (!filePath.startsWith('backups/')) {
            return res.status(403).json({ error: 'Akses ditolak' });
        }

        const absolutePath = path.join(__dirname, '..', filePath);
        const normalizedPath = path.normalize(absolutePath);
        const backupDir = path.join(__dirname, '..', 'backups');

        // Verifikasi path berada dalam direktori yang diizinkan
        if (!normalizedPath.startsWith(backupDir)) {
            return res.status(403).json({ error: 'Akses ditolak' });
        }

        // Verifikasi file ada
        if (!require('fs').existsSync(normalizedPath)) {
            return res.status(404).json({ error: 'File tidak ditemukan' });
        }

        // Set header untuk download
        res.setHeader('Content-Disposition', `attachment; filename=${path.basename(normalizedPath)}`);
        res.setHeader('Content-Type', 'application/gzip');

        // Stream file ke response
        const fileStream = require('fs').createReadStream(normalizedPath);
        fileStream.pipe(res);

        // Handle error
        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Gagal mengunduh file' });
            }
        });
    } catch (error) {
        console.error('Error in download route:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengunduh file' });
    }
});

module.exports = router; 