const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const mongoose = require('mongoose');

// Konfigurasi backup
const BACKUP_DIR = path.join(__dirname, '../../backups');
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = MONGODB_URI.split('/').pop().split('?')[0];
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Pastikan direktori backup ada
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Fungsi helper untuk mendapatkan URL download
const getDownloadUrl = (backupPath) => {
    const relativePath = path.relative(path.join(__dirname, '../..'), backupPath)
        .replace(/\\/g, '/'); // Mengubah backslash menjadi forward slash
    return `${API_URL}/download/${encodeURIComponent(relativePath)}`;
};

const Query = {
    getBackupHistory: async () => {
        try {
            const files = fs.readdirSync(BACKUP_DIR);
            const backups = files
                .filter(file => file.endsWith('.gz'))
                .map(file => {
                    const backupPath = path.join(BACKUP_DIR, file);
                    const stats = fs.statSync(backupPath);
                    return {
                        success: true,
                        message: 'Backup ditemukan',
                        backupPath,
                        timestamp: stats.mtime.toISOString(),
                        collections: [DB_NAME],
                        downloadUrl: getDownloadUrl(backupPath)
                    };
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return backups;
        } catch (error) {
            console.error('Error getting backup history:', error);
            throw new Error('Gagal mendapatkan riwayat backup');
        }
    },

    getLatestBackup: async () => {
        try {
            const backups = await Query.getBackupHistory();
            return backups[0] || null;
        } catch (error) {
            console.error('Error getting latest backup:', error);
            throw new Error('Gagal mendapatkan backup terbaru');
        }
    }
};

const Mutation = {
    createBackup: async (_, { description }) => {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.gz`);

            // Buat backup menggunakan mongodump
            const { stdout, stderr } = await execPromise(
                `mongodump --uri="${MONGODB_URI}" --archive="${backupPath}" --gzip`
            );

            if (stderr) {
                console.error('Backup stderr:', stderr);
            }

            // Simpan metadata backup
            const metadata = {
                description,
                timestamp,
                collections: [DB_NAME]
            };
            fs.writeFileSync(
                `${backupPath}.json`,
                JSON.stringify(metadata, null, 2)
            );

            return {
                success: true,
                message: 'Backup berhasil dibuat',
                backupPath,
                timestamp,
                collections: [DB_NAME],
                downloadUrl: getDownloadUrl(backupPath)
            };
        } catch (error) {
            console.error('Error creating backup:', error);
            throw new Error('Gagal membuat backup');
        }
    },

    restoreFromBackup: async (_, { backupPath }) => {
        try {
            // Verifikasi file backup ada
            if (!fs.existsSync(backupPath)) {
                throw new Error('File backup tidak ditemukan');
            }

            // Restore menggunakan mongorestore
            const { stdout, stderr } = await execPromise(
                `mongorestore --uri="${MONGODB_URI}" --archive="${backupPath}" --gzip --drop`
            );

            if (stderr) {
                console.error('Restore stderr:', stderr);
            }

            return {
                success: true,
                message: 'Data berhasil dipulihkan',
                restoredCollections: [DB_NAME],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error restoring backup:', error);
            throw new Error('Gagal memulihkan data');
        }
    },

    deleteBackup: async (_, { backupPath }) => {
        try {
            // Verifikasi file backup ada
            if (!fs.existsSync(backupPath)) {
                throw new Error('File backup tidak ditemukan');
            }

            // Hapus file backup dan metadata
            fs.unlinkSync(backupPath);
            if (fs.existsSync(`${backupPath}.json`)) {
                fs.unlinkSync(`${backupPath}.json`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting backup:', error);
            throw new Error('Gagal menghapus backup');
        }
    }
};

module.exports = {
    Query,
    Mutation
}; 