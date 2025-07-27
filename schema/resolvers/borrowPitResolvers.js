const BorrowPit = require('../../models/BorrowPit');

const Query = {
  // Get all borrow pits
  borrowPits: async (_, args, { user }) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const borrowPits = await BorrowPit.find();
      return borrowPits;
    } catch (err) {
      console.error('Error fetching borrow pits:', err);
      throw new Error('Failed to fetch borrow pits');
    }
  },
  
  // Get single borrow pit by ID
  borrowPit: async (_, { id }, { user }) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const borrowPit = await BorrowPit.findById(id);
      if (!borrowPit) {
        throw new Error(`Borrow pit with ID ${id} not found`);
      }
      return borrowPit;
    } catch (err) {
      console.error('Error fetching borrow pit:', err);
      throw new Error('Failed to fetch borrow pit');
    }
  },
  
  // Search borrow pits by name
  searchBorrowPits: async (_, { name }, { user }) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const regex = new RegExp(name, 'i');
      const borrowPits = await BorrowPit.find({ name: { $regex: regex } });
      return borrowPits;
    } catch (err) {
      console.error('Error searching borrow pits:', err);
      throw new Error('Failed to search borrow pits');
    }
  },
  
  // Find borrow pits near a point with given max distance in meters
  borrowPitsNearPoint: async (_, { longitude, latitude, maxDistance = 10000 }, { user }) => {
    if (!user) throw new Error('Not authenticated');
    try {
      const borrowPits = await BorrowPit.find({
        coordinates: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: maxDistance
          }
        }
      });
      return borrowPits;
    } catch (err) {
      console.error('Error finding borrow pits near point:', err);
      throw new Error('Failed to find nearby borrow pits');
    }
  }
};

const Mutation = {
  // Create a new borrow pit
  createBorrowPit: async (_, { input }, { user }) => {
    if (!user) throw new Error('Not authenticated');
  
    try {
      // Check if name is already taken
      const existingPit = await BorrowPit.findOne({ name: input.name });
      if (existingPit) {
        throw new Error(`Borrow pit with name "${input.name}" already exists`);
      }
      
      const newBorrowPit = new BorrowPit({
        name: input.name,
        locationName: input.locationName,
        coordinates: {
          type: 'Point',
          coordinates: [parseFloat(input.longitude), parseFloat(input.latitude)]
        }
      });
      
      const result = await newBorrowPit.save();
      return result;
    } catch (err) {
      console.error('Error creating borrow pit:', err);
      throw new Error('Failed to create borrow pit: ' + err.message);
    }
  },
  
  // Update an existing borrow pit
  updateBorrowPit: async (_, { id, input }, { user }) => {
    if (!user) throw new Error('Not authenticated');
    // Check if user has admin or supervisor role
 
    try {
      // Check if borrow pit exists
      const borrowPit = await BorrowPit.findById(id);
      if (!borrowPit) {
        throw new Error(`Borrow pit with ID ${id} not found`);
      }
      
      // Update fields
      if (input.name) borrowPit.name = input.name;
      if (input.locationName !== undefined) borrowPit.locationName = input.locationName;
      
      // Update coordinates if both longitude and latitude are provided
      if (input.longitude !== undefined && input.latitude !== undefined) {
        borrowPit.coordinates = {
          type: 'Point',
          coordinates: [parseFloat(input.longitude), parseFloat(input.latitude)]
        };
      }
      
      const updatedBorrowPit = await borrowPit.save();
      return updatedBorrowPit;
    } catch (err) {
      console.error('Error updating borrow pit:', err);
      throw new Error('Failed to update borrow pit: ' + err.message);
    }
  },
  
  // Delete a borrow pit
  deleteBorrowPit: async (_, { id }, { user }) => {
    if (!user) throw new Error('Not authenticated');
    // Check if user has admin role
  
    
    try {
      const result = await BorrowPit.findByIdAndDelete(id);
      
      if (!result) {
        throw new Error(`Borrow pit with ID ${id} not found`);
      }
      
      return {
        success: true,
        message: `Borrow pit with ID ${id} deleted successfully`
      };
    } catch (err) {
      console.error('Error deleting borrow pit:', err);
      throw new Error('Failed to delete borrow pit');
    }
  }
};

module.exports = {
  Query,
  Mutation,
  BorrowPit: {
    coordinates: (parent) => {
      // Jika parent.coordinates adalah objek GeoJSON
      if (parent.coordinates && Array.isArray(parent.coordinates.coordinates)) {
        return parent.coordinates.coordinates;
      }
      // Jika sudah array, langsung kembalikan
      return parent.coordinates;
    }
  }
};
