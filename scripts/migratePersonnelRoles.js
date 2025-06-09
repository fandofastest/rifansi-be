const mongoose = require('mongoose');
const PersonnelRole = require('../models/PersonnelRole');
require('dotenv').config();

async function migratePersonnelRoles() {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all roles
        const roles = await PersonnelRole.find();
        console.log(`Found ${roles.length} roles to migrate`);

        // Define non-personnel roles
        const nonPersonnelRoles = ['SUPERADMIN', 'ADMIN'];

        // Update each role
        for (const role of roles) {
            if (role.isPersonel === undefined) {
                const isPersonel = !nonPersonnelRoles.includes(role.roleCode);
                role.isPersonel = isPersonel;
                await role.save();
                console.log(`Updated role ${role.roleCode} with isPersonel=${isPersonel}`);
            }
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run migration if this script is run directly
if (require.main === module) {
    migratePersonnelRoles()
        .then(() => console.log('Migration script completed'))
        .catch(error => console.error('Migration script failed:', error));
}

module.exports = migratePersonnelRoles; 