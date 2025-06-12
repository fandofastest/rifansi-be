const mongoose = require('mongoose');
require('dotenv').config();

const EquipmentRepairReport = require('../models/EquipmentRepairReport');
const Area = require('../models/Area');

async function migrateRepairReportLocations() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all reports with string locations
        const reportsWithStringLocations = await EquipmentRepairReport.find({
            location: { $type: 'string' }
        });

        console.log(`Found ${reportsWithStringLocations.length} reports with string locations`);

        if (reportsWithStringLocations.length === 0) {
            console.log('No migration needed. All reports already use area references.');
            return;
        }

        // Get all areas for mapping
        const areas = await Area.find();
        console.log(`Found ${areas.length} areas in database`);

        let migratedCount = 0;
        let failedCount = 0;

        for (const report of reportsWithStringLocations) {
            try {
                const locationString = report.location;
                console.log(`Processing report ${report.reportNumber} with location: "${locationString}"`);

                // Skip if location is undefined, null, or empty
                if (!locationString || locationString === 'undefined' || locationString.trim() === '') {
                    console.log(`⚠️  Skipping report ${report.reportNumber} with invalid location: "${locationString}"`);
                    
                    // Set location to null for now, will require manual fix later
                    await EquipmentRepairReport.findByIdAndUpdate(report._id, {
                        location: null
                    });
                    failedCount++;
                    continue;
                }

                // Try to find matching area by name (case insensitive)
                let matchingArea = areas.find(area => 
                    area.name.toLowerCase().includes(locationString.toLowerCase()) ||
                    locationString.toLowerCase().includes(area.name.toLowerCase())
                );

                if (!matchingArea) {
                    // If no match found, try exact match first
                    matchingArea = areas.find(area => 
                        area.name.toLowerCase() === locationString.toLowerCase()
                    );
                }

                if (matchingArea) {
                    // Update report with area reference
                    await EquipmentRepairReport.findByIdAndUpdate(report._id, {
                        location: matchingArea._id
                    });
                    console.log(`✅ Migrated: "${locationString}" -> "${matchingArea.name}"`);
                    migratedCount++;
                } else {
                    // Create a new area for unmatched locations
                    console.log(`⚠️  No matching area found for: "${locationString}"`);
                    console.log(`📍 Creating new area: "${locationString}"`);
                    
                    // Create new area with default coordinates (you might want to adjust this)
                    const newArea = new Area({
                        name: locationString,
                        location: {
                            type: 'Point',
                            coordinates: [106.845599, -6.208763] // Default Jakarta coordinates
                        }
                    });
                    
                    const savedArea = await newArea.save();
                    
                    // Update report with new area reference
                    await EquipmentRepairReport.findByIdAndUpdate(report._id, {
                        location: savedArea._id
                    });
                    
                    console.log(`✅ Created new area and migrated: "${locationString}"`);
                    migratedCount++;
                }
            } catch (error) {
                console.error(`❌ Failed to migrate report ${report.reportNumber}:`, error.message);
                failedCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successfully migrated: ${migratedCount} reports`);
        console.log(`❌ Failed migrations: ${failedCount} reports`);
        console.log(`📍 Total processed: ${reportsWithStringLocations.length} reports`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run migration if this script is run directly
if (require.main === module) {
    migrateRepairReportLocations()
        .then(() => console.log('Migration script completed'))
        .catch(error => console.error('Migration script failed:', error));
}

module.exports = migrateRepairReportLocations; 