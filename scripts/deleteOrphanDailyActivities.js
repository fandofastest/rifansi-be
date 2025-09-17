require('dotenv').config();
const mongoose = require('mongoose');

// Load models
const DailyActivity = require('../models/DailyActivity');
const SPK = require('../models/SPK');
const ActivityDetail = require('../models/ActivityDetail');
const EquipmentLog = require('../models/EquipmentLog');
const ManpowerLog = require('../models/ManpowerLog');
const MaterialUsageLog = require('../models/MaterialUsageLog');
const OtherCost = require('../models/OtherCost');

const readline = require('readline');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.includes('-n'),
    force: args.includes('--force') || args.includes('-f')
  };
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI tidak ditemukan di .env');
  }
  await mongoose.connect(uri, {
    // keep defaults compatible with project
  });
}

async function findOrphanDailyActivities() {
  // Ambil semua spkId yang dipakai di DailyActivity
  const spkIdsInDaily = await DailyActivity.distinct('spkId');
  if (!spkIdsInDaily.length) return { orphanActivities: [], missingSpkIds: [] };

  // Cek spk yang masih ada
  const existingSpkIds = await SPK.find({ _id: { $in: spkIdsInDaily } }).distinct('_id');
  const existingSet = new Set(existingSpkIds.map(id => id.toString()));
  const missingSpkIds = spkIdsInDaily.filter(id => !existingSet.has(id.toString()));

  if (!missingSpkIds.length) return { orphanActivities: [], missingSpkIds: [] };

  const orphanActivities = await DailyActivity.find(
    { spkId: { $in: missingSpkIds } },
    { _id: 1, spkId: 1, date: 1 }
  ).lean();

  return { orphanActivities, missingSpkIds };
}

async function countRelated(orphanIds) {
  const [
    activityDetails,
    equipmentLogs,
    manpowerLogs,
    materialUsageLogs,
    otherCosts
  ] = await Promise.all([
    ActivityDetail.countDocuments({ dailyActivityId: { $in: orphanIds } }),
    EquipmentLog.countDocuments({ dailyActivityId: { $in: orphanIds } }),
    ManpowerLog.countDocuments({ dailyActivityId: { $in: orphanIds } }),
    MaterialUsageLog.countDocuments({ dailyActivityId: { $in: orphanIds } }),
    OtherCost.countDocuments({ dailyActivityId: { $in: orphanIds } })
  ]);

  return { activityDetails, equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts };
}

function askConfirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function run() {
  const { dryRun, force } = parseArgs();
  const startedAt = new Date();
  console.log('=== Delete Orphan DailyActivities ===');
  console.log('Waktu mulai:', startedAt.toISOString());
  console.log('Mode:', dryRun ? 'DRY-RUN (tanpa menghapus data)' : 'APPLY (menghapus data)');

  await connectDB();
  console.log('Terhubung ke MongoDB');

  const { orphanActivities, missingSpkIds } = await findOrphanDailyActivities();

  console.log(`SPK yang hilang (tidak ada di koleksi SPK): ${missingSpkIds.length}`);
  if (missingSpkIds.length) {
    console.log('Contoh missing SPK IDs:', missingSpkIds.slice(0, 5).map(id => id.toString()));
  }

  const orphanIds = orphanActivities.map(a => a._id);
  console.log(`DailyActivity orphan yang terdeteksi: ${orphanIds.length}`);
  if (orphanActivities.length) {
    const sample = orphanActivities.slice(0, 5);
    console.log('Contoh orphan DailyActivity:', sample.map(s => ({ _id: s._id.toString(), spkId: s.spkId?.toString(), date: s.date })));
  }

  const relatedCounts = await countRelated(orphanIds);
  console.log('Ringkasan data terkait yang akan terdampak:');
  console.table({
    ActivityDetail: relatedCounts.activityDetails,
    EquipmentLog: relatedCounts.equipmentLogs,
    ManpowerLog: relatedCounts.manpowerLogs,
    MaterialUsageLog: relatedCounts.materialUsageLogs,
    OtherCost: relatedCounts.otherCosts
  });

  if (dryRun || orphanIds.length === 0) {
    console.log('DRY-RUN selesai atau tidak ada data untuk dihapus. Tidak ada perubahan yang dilakukan.');
    await mongoose.disconnect();
    return;
  }

  if (!force) {
    const ok = await askConfirm('Lanjut hapus data di atas? ketik "yes" untuk konfirmasi: ');
    if (!ok) {
      console.log('Dibatalkan oleh pengguna.');
      await mongoose.disconnect();
      return;
    }
  }

  // Eksekusi penghapusan bertahap
  const results = {};
  results.activityDetails = await ActivityDetail.deleteMany({ dailyActivityId: { $in: orphanIds } });
  results.equipmentLogs  = await EquipmentLog.deleteMany({ dailyActivityId: { $in: orphanIds } });
  results.manpowerLogs   = await ManpowerLog.deleteMany({ dailyActivityId: { $in: orphanIds } });
  results.materialUsage  = await MaterialUsageLog.deleteMany({ dailyActivityId: { $in: orphanIds } });
  results.otherCosts     = await OtherCost.deleteMany({ dailyActivityId: { $in: orphanIds } });
  results.dailyActivities= await DailyActivity.deleteMany({ _id: { $in: orphanIds } });

  console.log('Hasil penghapusan:');
  console.table({
    ActivityDetail: results.activityDetails.deletedCount || 0,
    EquipmentLog: results.equipmentLogs.deletedCount || 0,
    ManpowerLog: results.manpowerLogs.deletedCount || 0,
    MaterialUsageLog: results.materialUsage.deletedCount || 0,
    OtherCost: results.otherCosts.deletedCount || 0,
    DailyActivity: results.dailyActivities.deletedCount || 0
  });

  const finishedAt = new Date();
  console.log('Selesai pada:', finishedAt.toISOString());
  console.log('Durasi (detik):', ((finishedAt - startedAt) / 1000).toFixed(2));

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Terjadi kesalahan:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
