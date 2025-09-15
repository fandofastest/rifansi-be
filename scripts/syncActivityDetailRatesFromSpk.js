#!/usr/bin/env node
/*
  syncActivityDetailRatesFromSpk.js
  Copies rates (harga) from SPK workItems to ActivityDetail if they differ.

  Usage examples:
    node scripts/syncActivityDetailRatesFromSpk.js --spkId <SPK_ID>
    node scripts/syncActivityDetailRatesFromSpk.js --spkId <SPK_ID> --dry-run

  Notes:
  - This script updates ActivityDetail.rates.nr.rate and ActivityDetail.rates.r.rate
    to match SPK.workItems[].rates for the corresponding workItemId.
  - It only touches ActivityDetails that belong to DailyActivities under the given SPK.
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const mongoose = require('mongoose');

const ActivityDetail = require('../models/ActivityDetail');
const DailyActivity = require('../models/DailyActivity');
const SPK = require('../models/SPK');
// Register WorkItem model so SPK.populate('workItems.workItemId') works without schema errors
require('../models/WorkItem');

function parseArgs(argv) {
  const out = { dryRun: false, verbose: false, showEqual: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--spkId' || a === '--spk-id') {
      out.spkId = argv[i + 1];
      i++;
    } else if (a === '--dry-run' || a === '--dry' || a === '--dryRun') {
      out.dryRun = true;
    } else if (a === '--verbose' || a === '-v') {
      out.verbose = true;
    } else if (a === '--show-equal') {
      out.showEqual = true;
    } else if (a === '--limit') {
      const v = Number(argv[i + 1]);
      out.limit = Number.isFinite(v) ? v : 0;
      i++;
    }
  }
  return out;
}

async function connect() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rifansi';
  const opts = { maxPoolSize: 10 };
  console.log(`[DB] Connecting to ${uri} ...`);
  await mongoose.connect(uri, opts);
  console.log('[DB] Connected');
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isDifferent(detailRate, spkRate) {
  // Compare with numeric equality
  return toNumber(detailRate) !== toNumber(spkRate);
}

function ensureRatesShape(r) {
  return {
    nr: { rate: toNumber(r?.nr?.rate) },
    r: { rate: toNumber(r?.r?.rate) },
  };
}

async function buildSpkRatesMap(spk) {
  const map = new Map();
  for (const wi of spk.workItems || []) {
    const key = String(wi.workItemId?._id || wi.workItemId || '');
    if (!key) continue;
    const nrRate = toNumber(wi.rates?.nr?.rate);
    const rRate = toNumber(wi.rates?.r?.rate);
    map.set(key, { nr: nrRate, r: rRate });
  }
  return map;
}

async function processSpk(spkId, { dryRun = false, limit = 0, verbose = false, showEqual = false } = {}) {
  const spk = await SPK.findById(spkId)
    .populate({ path: 'workItems.workItemId', select: '_id name' });
  if (!spk) {
    console.error(`[ERR] SPK not found: ${spkId}`);
    return { updated: 0, examined: 0, skippedNoRate: 0, equal: 0 };
  }

  const ratesMap = await buildSpkRatesMap(spk);

  const dailyActivities = await DailyActivity.find({ spkId: spk._id }).select('_id date');
  const daIds = dailyActivities.map(d => d._id);
  if (daIds.length === 0) {
    console.log(`[INFO] No DailyActivity for SPK ${spk.spkNo || spk._id}`);
    return { updated: 0, examined: 0, skippedNoRate: 0, equal: 0 };
  }

  const query = { dailyActivityId: { $in: daIds } };
  const cursor = ActivityDetail.find(query).cursor();

  let examined = 0;
  let updated = 0;
  let skippedNoRate = 0;
  let equal = 0;

  while (true) {
    const detail = await cursor.next();
    if (!detail) break;
    examined++;
    if (limit && examined > limit) break;

    const workItemIdStr = String(detail.workItemId?._id || detail.workItemId || '');
    if (!workItemIdStr) {
      if (verbose) console.warn(`[WARN] ActivityDetail ${detail._id} has no workItemId`);
      continue;
    }

    const spkRate = ratesMap.get(workItemIdStr);
    if (!spkRate) {
      skippedNoRate++;
      if (verbose) console.log(`[SKIP] No SPK rate found for workItemId=${workItemIdStr} (detail=${detail._id})`);
      continue;
    }

    const current = ensureRatesShape(detail.rates);
    const desired = { nr: { rate: spkRate.nr }, r: { rate: spkRate.r } };

    const needUpdate = isDifferent(current.nr.rate, desired.nr.rate) || isDifferent(current.r.rate, desired.r.rate);

    if (!needUpdate) {
      equal++;
      if (showEqual) {
        console.log(`[EQUAL] detail=${detail._id} wi=${workItemIdStr} NR=${current.nr.rate} R=${current.r.rate}`);
      } else if (verbose) {
        console.log(`[CHECK] No change needed detail=${detail._id} wi=${workItemIdStr}`);
      }
      continue;
    }

    console.log(`[UPDATE] detail=${detail._id} wi=${workItemIdStr} NR ${current.nr.rate} -> ${desired.nr.rate}, R ${current.r.rate} -> ${desired.r.rate}`);

    if (!dryRun) {
      detail.rates = desired;
      await detail.save();
    }
    updated++;
  }

  return { examined, updated, skippedNoRate, equal };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.spkId) {
    console.error('Usage: node scripts/syncActivityDetailRatesFromSpk.js --spkId <SPK_ID> [--dry-run] [--limit N]');
    process.exitCode = 1;
    return;
  }

  await connect();
  try {
    const res = await processSpk(args.spkId, { dryRun: args.dryRun, limit: args.limit, verbose: args.verbose, showEqual: args.showEqual });
    console.log(`[DONE] examined=${res.examined} updated=${res.updated} equal=${res.equal} skippedNoRate=${res.skippedNoRate} dryRun=${args.dryRun}`);
  } catch (e) {
    console.error('[FATAL]', e?.message || e);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[DB] Disconnected');
  }
}

if (require.main === module) {
  main();
}
