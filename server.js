const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { json } = require('body-parser');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const PersonnelRole = require('./models/PersonnelRole');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const { importExcelToSPK } = require('./scripts/importExcell');

const typeDefs = require('./schema/typeDefs');
const resolvers = require('./schema/resolvers');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'], // Sesuaikan dengan domain frontend Anda
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import router
const importRouter = require('./routes/import');
app.use('/api', importRouter);

// Initialize Default PersonnelRoles
const initializeDefaultRoles = async () => {
  try {
    const roles = [
      {
        roleCode: 'SUPERADMIN',
        roleName: 'Super Administrator',
        hourlyRate: 0,
        description: 'Super Administrator with full access'
      },
      {
        roleCode: 'ADMIN',
        roleName: 'Administrator',
        hourlyRate: 0,
        description: 'Administrator with management access'
      },
      {
        roleCode: 'SUPERVISOR',
        roleName: 'Supervisor',
        hourlyRate: 0,
        description: 'Supervisor role'
      },
      {
        roleCode: 'MANDOR',
        roleName: 'Mandor',
        hourlyRate: 0,
        description: 'Mandor role'
      },
      {
        roleCode: 'USER',
        roleName: 'Regular User',
        hourlyRate: 0,
        description: 'Regular user with limited access'
      }
    ];

    for (const role of roles) {
      const existingRole = await PersonnelRole.findOne({ roleCode: role.roleCode });
      if (!existingRole) {
        await PersonnelRole.create(role);
        console.log(`Role ${role.roleCode} created`);
      }
    }
    console.log('Default roles initialized');
  } catch (error) {
    console.error('Error initializing default roles:', error);
  }
};

// Initialize Superadmin
const initializeSuperadmin = async () => {
  try {
    // Check for any users with superadmin role reference
    const superadminRole = await PersonnelRole.findOne({ roleCode: 'SUPERADMIN' });
    if (!superadminRole) {
      throw new Error('SUPERADMIN role not found. Make sure roles are initialized first.');
    }

    // Check for existing superadmin with old string-based role
    const existingSuperadmin = await User.findOne({ username: 'superadmin' });
    
    if (existingSuperadmin) {
      // Update existing superadmin to use new role reference
      if (existingSuperadmin.role && typeof existingSuperadmin.role === 'string') {
        console.log('Updating existing superadmin to use role reference');
        existingSuperadmin.role = superadminRole._id;
        await existingSuperadmin.save();
        console.log('Superadmin updated successfully');
      }
    } else {
      // Create new superadmin
      const superadmin = new User({
        username: 'superadmin',
        password: 'superadmin123', // Change this password in production
        email: 'superadmin@example.com',
        phone: '081234567890',
        fullName: 'Super Admin',
        role: superadminRole._id
      });

      await superadmin.save();
      console.log('Superadmin created successfully');
    }
  } catch (error) {
    console.error('Error initializing superadmin:', error);
  }
};

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Initialize default roles first, then superadmin
    await initializeDefaultRoles();
    await initializeSuperadmin();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start Apollo Server
async function startServer() {
  await server.start();
  
  // Apply Apollo middleware
  app.use(
    '/graphql',
    cors(),
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // If roleCode is missing but userId exists, try to populate it
            if (!decoded.roleCode && decoded.userId) {
              const user = await User.findById(decoded.userId).populate('role');
              if (user && user.role) {
                decoded.roleCode = user.role.roleCode;
              }
            }
            
            return { user: decoded };
          } catch (error) {
            return {};
          }
        }
        return {};
      },
    })
  );

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
}

startServer(); 