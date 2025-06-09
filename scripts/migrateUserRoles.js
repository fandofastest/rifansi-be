require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const PersonnelRole = require('../models/PersonnelRole');

async function migrateUserRoles() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users from the database
    const users = await User.find().lean();
    console.log(`Found ${users.length} users in the database`);

    // Get all personnel roles
    const roles = await PersonnelRole.find().lean();
    if (roles.length === 0) {
      throw new Error('No personnel roles found. Please initialize roles first.');
    }
    console.log(`Found ${roles.length} personnel roles in the database`);

    // Create a map of role codes to role IDs
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.roleCode] = role._id;
    });

    // Define role mapping (old string to new role code)
    const roleMapping = {
      'superadmin': 'SUPERADMIN',
      'admin': 'ADMIN',
      'mandor': 'MANDOR',
      'supervisor': 'SUPERVISOR',
      'user': 'USER'
    };

    // Count of migrated users
    let migrationCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Migrate each user
    for (const user of users) {
      try {
        // Skip users that already have ObjectId roles
        if (typeof user.role !== 'string') {
          console.log(`Skipping user ${user.username} - role already migrated`);
          skippedCount++;
          continue;
        }

        // Map the old role string to new role code
        const oldRole = user.role.toLowerCase();
        const newRoleCode = roleMapping[oldRole] || 'USER'; // Default to USER if mapping not found

        // Get the role ID from the map
        const newRoleId = roleMap[newRoleCode];
        if (!newRoleId) {
          console.error(`Role '${newRoleCode}' not found in the database`);
          failedCount++;
          continue;
        }

        // Update the user with the new role ID
        const result = await User.updateOne(
          { _id: user._id },
          { $set: { role: newRoleId } }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ Migrated user ${user.username} from role '${oldRole}' to '${newRoleCode}'`);
          migrationCount++;
        } else {
          console.log(`⚠️ No changes made for user ${user.username}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error migrating user ${user.username}:`, error);
        failedCount++;
      }
    }

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Total users: ${users.length}`);
    console.log(`Users migrated: ${migrationCount}`);
    console.log(`Users skipped: ${skippedCount}`);
    console.log(`Users failed: ${failedCount}`);
    console.log('========================\n');

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateUserRoles().then(() => {
  console.log('Migration script completed');
}); 