/*
  Backfill ActivityDetail.rates from SPK.workItems.rates
  Scope: a single SPK (required)
  - Resolve DailyActivity by spkId
  - For each ActivityDetail under those activities, map to SPK.workItems by workItemId
  - Update ActivityDetail.rates.nr.rate and .r.rate (and descriptions if present)

  Usage:
    node scripts/backfillActivityDetailRates.js --spk=<SPK_ID> [--dry-run]
*/

require('dotenv').config();
const mongoose = require('mongoose');

const ActivityDetail = require('../models/ActivityDetail');
const DailyActivity = require('../models/DailyActivity');
const SPK = require('../models/SPK');

const DRY_RUN = process.argv.includes('--dry-run');
const spkArg = process.argv.find(a => a.startsWith('--spk='));
const SPK_ID = spkArg ? spkArg.split('=')[1] : undefined;

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not set in .env');
  }
  await mongoose.connect(uri, { autoIndex: false });
}

async function main() {
  await connect();
  if (!SPK_ID) {
    throw new Error('Missing required --spk=<SPK_ID>');
  }
  console.log(`[Start] Backfill ActivityDetail rates for SPK ${SPK_ID} ${DRY_RUN ? '(dry-run)' : ''}`);

  // Preload all DailyActivities for the SPK
  const das = await DailyActivity.find({ spkId: SPK_ID }).select('_id').lean();
  const daIds = das.map(d => d._id);
  if (daIds.length === 0) {
    console.log('No DailyActivity found for given SPK. Nothing to update.');
    await mongoose.disconnect();
    return;
  }

  // Load SPK and build workItem rates map
  const spk = await SPK.findById(SPK_ID).select('workItems.workItemId workItems.rates').lean();
  if (!spk) {
    throw new Error(`SPK not found: ${SPK_ID}`);
  }
  const wiRateMap = new Map();
  for (const wi of spk.workItems || []) {
    const id = wi.workItemId?.toString();
    if (!id) continue;
    wiRateMap.set(id, {
      nr: { rate: wi.rates?.nr?.rate ?? 0, description: wi.rates?.nr?.description ?? 'Non-remote rate' },
      r: { rate: wi.rates?.r?.rate ?? 0, description: wi.rates?.r?.description ?? 'Remote rate' }
    });
  }

  let processed = 0;
  let updated = 0;
  let missingWI = 0;
  let unchanged = 0;

  const cursor = ActivityDetail.find({ dailyActivityId: { $in: daIds } }, null, { lean: true }).cursor();

  for await (const detail of cursor) {
    processed++;
    const wiId = detail.workItemId?.toString();
    if (!wiId) {
      continue;
    }

    const spkRates = wiRateMap.get(wiId);
    if (!spkRates) {
      missingWI++;
      continue;
    }

    const currentNR = detail.rates?.nr?.rate ?? 0;
    const currentR = detail.rates?.r?.rate ?? 0;

    // Decide if update is needed
    const needUpdate = currentNR !== spkRates.nr.rate || currentR !== spkRates.r.rate;

    if (!needUpdate) {
      unchanged++;
      continue;
    }

    if (DRY_RUN) {
      if (processed % 500 === 0) console.log(`[Dry] #${processed} AD ${detail._id} will update NR ${currentNR} -> ${spkRates.nr.rate}, R ${currentR} -> ${spkRates.r.rate}`);
      updated++; // count as would-be updated
      continue;
    }

    // Perform update
    const update = {
      'rates.nr.rate': spkRates.nr.rate,
      'rates.nr.description': spkRates.nr.description,
      'rates.r.rate': spkRates.r.rate,
      'rates.r.description': spkRates.r.description,
      updatedAt: new Date()
    };

    await ActivityDetail.updateOne({ _id: detail._id }, { $set: update });
    updated++;

    if (updated % 200 === 0) console.log(`[Prog] Updated ${updated}/${processed} (missWI: ${missingWI}, unchanged: ${unchanged})`);
  }

  console.log(`[Done] SPK ${SPK_ID} -> Processed: ${processed}, Updated: ${updated}, MissingWorkItem: ${missingWI}, Unchanged: ${unchanged}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Error:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
