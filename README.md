# Backend RIFANSI BE

Backend Node.js untuk autentikasi, GraphQL API, import Excel SPK/WAP-BOQ, serta fitur backup/restore MongoDB.

## Ringkasan Stack
- **Runtime**: Node.js
- **Web Framework**: Express
- **API**: GraphQL (Apollo Server v4 on Express)
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (Bearer)
- **Upload**: Multer (Excel .xlsx/.xls)
- **Env Loader**: dotenv

## Instalasi & Menjalankan
- **Prasyarat**:
  - Node.js 18+
  - MongoDB (cluster/instance)
  - Tool CLI Mongo (untuk backup/restore: `mongodump`, `mongorestore`)
- **Langkah**:
  1. Clone repo
  2. Install dependencies:
     ```bash
     npm install
     ```
  3. Buat file `.env` (lihat template di bawah)
  4. Jalankan:
     - Development (hot-reload):
       ```bash
       npm run dev
       ```
     - Production:
       ```bash
       npm start
       ```
  5. Endpoint GraphQL tersedia di:
     ```
     http://localhost:<PORT>/graphql
     ```

## Konfigurasi `.env`
Salin dan sesuaikan nilai berikut:

```bash
# Port server Express/Apollo
PORT=4000

# Koneksi MongoDB
# Contoh lokal: mongodb://127.0.0.1:27017/rifansi
# Contoh Atlas: mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
MONGODB_URI=mongodb://127.0.0.1:27017/rifansi

# Secret untuk JWT (WAJIB, gunakan nilai kuat/acak)
JWT_SECRET=ubah_ini_dengan_yang_sangat_acak

# CORS origins (koma-separasi). Contoh: FE dev dan staging
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# URL publik backend (digunakan untuk membuat link download backup)
# Misal saat deploy di VPS/domain:
# API_URL=https://api.example.com
API_URL=http://localhost:4000

# (Opsional) Digunakan oleh script utilitas impor via GraphQL
GRAPHQL_API=http://localhost:4000/graphql
# Jika tidak set AUTH_TOKEN, script akan mencoba login dengan admin berikut:
AUTH_TOKEN=
ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=superadmin123
```

Catatan:
- `JWT_SECRET` wajib diisi.
- `MONGODB_URI` wajib diisi.
- `API_URL` diperlukan agar URL download backup yang dihasilkan valid.
- `CORS_ORIGINS` penting agar FE bisa mengakses API saat berbeda origin.

## Scripts NPM
- **start**: menjalankan server produksi.
- **dev**: menjalankan server dengan nodemon.
- **clean:orphan-daily**: hapus data DailyActivity yatim-piatu beserta relasinya.
- **clean:orphan-daily:dry**: jalankan pembersihan mode simulasi (tidak menghapus).

Contoh:
```bash
npm run clean:orphan-daily:dry
npm run clean:orphan-daily
```

## Endpoint Utama

- **GraphQL**: `POST /graphql`  
  Sertakan header Authorization untuk endpoint yang butuh autentikasi:
  ```
  Authorization: Bearer <JWT>
  ```

- **Upload Excel SPK/WAP-BOQ (REST)**: prefix `POST /upload`
  - `/import-spk-old`  
    Body: `multipart/form-data` dengan field `excelFile` (.xlsx/.xls)
  - `/import-spk` (rekomendasi, multi-format)  
    Body: `multipart/form-data` `excelFile`
  - `/import-auto` (auto-detect format)  
    Body: `multipart/form-data` `excelFile`
  - `/test-wap` (test ekstraksi metadata, tidak simpan DB)  
    Body: `multipart/form-data` `excelFile`

- **Download Backup (REST)**: `GET /download/:filePath`  
  Dilindungi JWT. Hanya file dalam folder `backups/` yang bisa diunduh.  
  Header:
  ```
  Authorization: Bearer <JWT>
  ```

## Autentikasi
- JWT dibuat dengan `JWT_SECRET`.
- Kirim token via header `Authorization: Bearer <token>`.
- Banyak operasi GraphQL (mis. user queries/mutations) memerlukan JWT.

## Role Awal & Superadmin
Saat server start:
- Role default diinisialisasi: `SUPERADMIN`, `ADMIN`, `SUPERVISOR`, `PMCOW`.
- User `superadmin` otomatis dipastikan ada:
  - username: `superadmin`
  - password: `superadmin123` (WAJIB diganti di produksi)
- Ubah password segera setelah deploy.

## Fitur Backup/Restore (GraphQL)
Resolver backup (lihat `schema/resolvers/backupResolvers.js`) menyediakan:
- **Query**
  - `getBackupHistory`: daftar file backup `.gz` di folder `backups/` beserta `downloadUrl`.
  - `getLatestBackup`: item backup terbaru.
- **Mutation**
  - `createBackup(description: String)`: membuat file backup via `mongodump`.
  - `restoreFromBackup(backupPath: String!)`: restore via `mongorestore --drop`.
  - `deleteBackup(backupPath: String!)`: hapus file backup (+ metadata .json jika ada).

Catatan:
- Pastikan `mongodump` dan `mongorestore` tersedia di PATH server.
- `API_URL` digunakan untuk menyusun `downloadUrl`.

## Utilitas Import via Script
Tersedia script untuk impor data Overtime Rate dan WAP/BOQ.

1) Import Overtime Rate langsung ke MongoDB:
```bash
node scripts/importOvertimeRates.js
```
- Memakai `MONGODB_URI`.

2) Import Overtime Rate via GraphQL (dengan auth):
```bash
node scripts/importOvertimeRatesWithGraphQL.js
```
- Env dipakai: `GRAPHQL_API`, `AUTH_TOKEN` atau `ADMIN_USERNAME` + `ADMIN_PASSWORD`.

3) Runner Import Excel SPK/WAP-BOQ:
```bash
# Mode yang tersedia: old | wap | test | boq | save-boq | complete | complete-v2 | complete-v3
node scripts/runImport.js <mode> <path_ke_file_excel>

# contoh:
node scripts/runImport.js complete-v3 ./contoh.xlsx
```
- Untuk mode selain `test`/`boq`, script akan konek ke MongoDB (`MONGODB_URI`).

## Pembersihan Data Orphan
- Hapus DailyActivity yang referensi `spkId`-nya tidak ada:
```bash
# dry-run (tidak menghapus)
npm run clean:orphan-daily:dry

# apply (hapus data terkait + daily)
npm run clean:orphan-daily
```
- Script akan menampilkan ringkasan jumlah data terkait yang akan terdampak.

## Struktur Folder (ringkas)
- `server.js`: entry point server
- `schema/`: GraphQL `typeDefs` dan `resolvers`
- `routes/`: route REST (`/upload`, `/download`)
- `scripts/`: utilitas impor/migrasi/pembersihan
- `models/`: skema Mongoose
- `uploads/`: sementara file upload (dibuat otomatis)
- `backups/`: output backup (dibuat otomatis)

## Keamanan & Produksi
- Wajib set `JWT_SECRET` kuat.
- Segera ganti password default `superadmin`.
- Batasi `CORS_ORIGINS` ke domain resmi.
- Pastikan permission folder `backups/` aman.
- Simpan `MONGODB_URI` dan secrets di secret manager pada environment produksi.

## Troubleshooting
- Tidak bisa konek DB: cek `MONGODB_URI` dan konektivitas ke MongoDB.
- CORS error: sesuaikan `CORS_ORIGINS`.
- JWT error: pastikan header `Authorization` benar dan `JWT_SECRET` konsisten.
- Backup gagal: pastikan `mongodump/mongorestore` terinstall dan `API_URL` benar.

## Lisensi
ISC
