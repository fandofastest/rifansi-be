require('dotenv').config();
const mongoose = require('mongoose');
const SPK = require('../models/SPK');

async function updateSPKWorkItems() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all SPKs
    const spks = await SPK.find();
    console.log(`Found ${spks.length} SPKs`);

    // Update each SPK's work items
    for (const spk of spks) {
      if (spk.workItems && spk.workItems.length > 0) {
        let updated = false;
        
        for (const workItem of spk.workItems) {
          if (!workItem.boqVolume) {
            workItem.boqVolume = { nr: 0, r: 0 };
            updated = true;
          } else {
            if (workItem.boqVolume.nr === undefined) {
              workItem.boqVolume.nr = 0;
              updated = true;
            }
            if (workItem.boqVolume.r === undefined) {
              workItem.boqVolume.r = 0;
              updated = true;
            }
          }
        }

        if (updated) {
          await spk.save();
          console.log(`Updated SPK ${spk.spkNo}`);
        }
      }
    }

    console.log('Update completed');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateSPKWorkItems(); 