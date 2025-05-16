const mongoose = require('mongoose');
const WorkItem = require('../models/WorkItem');
require('dotenv').config();

async function updateWorkItemRates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const workItems = await WorkItem.find({});
        console.log(`Found ${workItems.length} work items to update`);

        for (const workItem of workItems) {
            if (!workItem.rates || !workItem.rates.nr || !workItem.rates.r) {
                workItem.rates = {
                    nr: {
                        rate: 0,
                        description: 'Non-remote rate'
                    },
                    r: {
                        rate: 0,
                        description: 'Remote rate'
                    }
                };
                await workItem.save();
                console.log(`Updated work item: ${workItem.name}`);
            }
        }

        console.log('Update completed successfully');
    } catch (error) {
        console.error('Error updating work items:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

updateWorkItemRates(); 