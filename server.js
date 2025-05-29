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
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const http = require('http');
const downloadRouter = require('./routes/download');

const { typeDefs, resolvers } = require('./schema');

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
app.use('/download', downloadRouter);
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

async function startApolloServer() {
  const httpServer = http.createServer(app);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    context: ({ req }) => {
      console.log('GraphQL request:', req.body);
      // Get the user token from the headers
      const token = req.headers.authorization || '';

      // Try to retrieve a user with the token
      if (token) {
        try {
          const user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
          return { user };
        } catch (e) {
          console.error('Error verifying token:', e);
        }
      }

      return { user: null };
    }
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        console.log('GraphQL request:', req.body);
        // Get the user token from the headers
        const token = req.headers.authorization || '';

        // Try to retrieve a user with the token
        if (token) {
          try {
            const user = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
            return { user };
          } catch (e) {
            console.error('Error verifying token:', e);
          }
        }

        return { user: null };
      }
    })
  );

  const PORT = process.env.PORT || 4000;
  await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
}

startApolloServer().catch(error => {
  console.error('Error starting server:', error);
}); 