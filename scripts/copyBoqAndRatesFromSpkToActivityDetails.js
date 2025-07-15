/**
 * Script to copy BOQ volumes and rates from SPK to ActivityDetail records
 * This ensures that all ActivityDetails have the historical BOQ volumes and rates stored
 * Usage: node scripts/copyBoqAndRatesFromSpkToActivityDetails.js
 */

const mongoose = require('mongoose');
const { ActivityDetail, DailyActivity, SPK } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

/**
 * Copy BOQ volumes and rates from SPK workItems to ActivityDetail records
 */
const copyBoqAndRatesToActivityDetails = async () => {
  try {
    console.log('Starting BOQ volume and rates copy process...');
    
    // Get all ActivityDetail records
    const activityDetails = await ActivityDetail.find({});
    console.log(`Found ${activityDetails.length} activity details to process`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each ActivityDetail
    for (let i = 0; i < activityDetails.length; i++) {
      const activityDetail = activityDetails[i];
      
      try {
        // Get the parent DailyActivity to find the SPK ID
        const dailyActivity = await DailyActivity.findById(activityDetail.dailyActivityId);
        
        if (!dailyActivity) {
          console.log(`No daily activity found for ActivityDetail ${activityDetail._id}, skipping...`);
          skippedCount++;
          continue;
        }
        
        // Get the SPK
        const spk = await SPK.findById(dailyActivity.spkId);
        
        if (!spk) {
          console.log(`No SPK found for DailyActivity ${dailyActivity._id}, skipping...`);
          skippedCount++;
          continue;
        }
        
        // Find the matching workItem in the SPK
        const workItemEntry = spk.workItems.find(item => 
          item.workItemId.toString() === activityDetail.workItemId.toString()
        );
        
        if (!workItemEntry) {
          console.log(`No matching workItem found in SPK ${spk._id} for ActivityDetail ${activityDetail._id}, skipping...`);
          skippedCount++;
          continue;
        }
        
        // Copy BOQ volume and rates from SPK's workItem to ActivityDetail
        activityDetail.boqVolume = {
          nr: workItemEntry.boqVolume.nr || 0,
          r: workItemEntry.boqVolume.r || 0
        };
        
        activityDetail.rates = {
          nr: {
            rate: workItemEntry.rates.nr.rate || 0,
            description: workItemEntry.rates.nr.description || 'Non-remote rate'
          },
          r: {
            rate: workItemEntry.rates.r.rate || 0,
            description: workItemEntry.rates.r.description || 'Remote rate'
          }
        };
        
        // Save the updated ActivityDetail
        await activityDetail.save();
        
        console.log(`Successfully updated ActivityDetail ${activityDetail._id}`);
        updatedCount++;
        
        // Log progress every 100 records
        if (updatedCount % 100 === 0) {
          console.log(`Progress: ${updatedCount}/${activityDetails.length} records updated`);
        }
      } catch (error) {
        console.error(`Error updating ActivityDetail ${activityDetail._id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\nProcess completed!');
    console.log(`Total records: ${activityDetails.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error in copy process:', error);
  }
};

const main = async () => {
  await connectDB();
  await copyBoqAndRatesToActivityDetails();
  console.log('Disconnecting from database...');
  await mongoose.disconnect();
  console.log('Done!');
  process.exit(0);
};

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
