/*
Usage:
  node scripts/fix_swap_nr_r_for_spk.js --spkId=685b5688132a1fe9435fbb8f [--apply]

Notes:
- By default runs in DRY-RUN mode (no DB writes). Add --apply to persist changes.
- Swaps nr <-> r for fields in ActivityDetail: actualQuantity, rates (rate + description), and boqVolume.
- Scope: all ActivityDetail whose DailyActivity.spkId == provided spkId.
*/

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const DailyActivity = require('../models/DailyActivity');
const ActivityDetail = require('../models/ActivityDetail');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { spkId: null, apply: false };
  for (const arg of args) {
    if (arg.startsWith('--spkId=')) parsed.spkId = arg.split('=')[1];
    if (arg === '--apply') parsed.apply = true;
  }
  if (!parsed.spkId) {
    console.error('Error: --spkId is required');
    process.exit(1);
  }
  return parsed;
}

function swapNrR(obj = {}) {
  return { nr: obj?.r ?? 0, r: obj?.nr ?? 0 };
}

function swapRates(rates = {}) {
  const nr = rates?.nr || {}; const r = rates?.r || {};
  return {
    nr: { rate: r?.rate ?? 0, description: r?.description ?? 'Remote rate' },
    r: { rate: nr?.rate ?? 0, description: nr?.description ?? 'Non-remote rate' }
  };
}

(async () => {
  const { spkId, apply } = parseArgs();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI is not set in environment');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  try {
    // Find DailyActivities for this SPK
    const dailyActivities = await DailyActivity.find({ spkId });
    if (!dailyActivities.length) {
      console.log(`No DailyActivity found for SPK ${spkId}`);
      process.exit(0);
    }
    const dailyIds = dailyActivities.map(d => d._id);

    // Find impacted ActivityDetails
    const details = await ActivityDetail.find({ dailyActivityId: { $in: dailyIds } });
    console.log(`Found ${details.length} ActivityDetail to process for SPK ${spkId}`);

    let modified = 0;
    let previewCount = 0;

    for (const doc of details) {
      const before = {
        boqVolume: { ...doc.boqVolume },
        rates: {
          nr: { ...(doc.rates?.nr || {}) },
          r: { ...(doc.rates?.r || {}) }
        },
        actualQuantity: { ...doc.actualQuantity }
      };

      // Build swapped objects
      const newBoq = swapNrR(doc.boqVolume || {});
      const newRates = swapRates(doc.rates || {});
      const newQty = swapNrR(doc.actualQuantity || {});

      const changed = (
        (before.boqVolume.nr !== newBoq.nr) || (before.boqVolume.r !== newBoq.r) ||
        (before.rates?.nr?.rate !== newRates.nr.rate) || (before.rates?.r?.rate !== newRates.r.rate) ||
        (before.actualQuantity.nr !== newQty.nr) || (before.actualQuantity.r !== newQty.r)
      );

      if (!changed) continue;

      if (!apply) {
        if (previewCount < 5) {
          console.log('Preview change for ActivityDetail', String(doc._id));
          console.table({
            field: ['boq.nr','boq.r','rate.nr','rate.r','qty.nr','qty.r'],
            before: [before.boqVolume.nr, before.boqVolume.r, before.rates.nr.rate, before.rates.r.rate, before.actualQuantity.nr, before.actualQuantity.r],
            after: [newBoq.nr, newBoq.r, newRates.nr.rate, newRates.r.rate, newQty.nr, newQty.r]
          });
          previewCount++;
        }
      } else {
        doc.boqVolume = newBoq;
        doc.rates = newRates;
        doc.actualQuantity = newQty;
        await doc.save();
      }
      modified++;
    }

    console.log(apply ? `Applied swaps to ${modified} ActivityDetail docs.` : `DRY-RUN: Would swap ${modified} ActivityDetail docs. Add --apply to persist.`);
  } catch (err) {
    console.error('Error during processing:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
})();
