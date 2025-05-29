const { Area } = require('../../models');

const Query = {
    areas: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Area.find().sort({ name: 1 });
    },
    area: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Area.findById(id);
    },
    areasNearby: async (_, { latitude, longitude, maxDistance }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Area.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: maxDistance
                }
            }
        });
    }
};

const Mutation = {
    createArea: async (_, { name, latitude, longitude }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const area = new Area({
            name,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude]
            }
        });

        return area.save();
    },

    updateArea: async (_, { id, name, latitude, longitude }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const updateData = {};
        if (name) updateData.name = name;
        if (latitude !== undefined && longitude !== undefined) {
            updateData.location = {
                type: 'Point',
                coordinates: [longitude, latitude]
            };
        }

        return Area.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
    },

    deleteArea: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await Area.findByIdAndDelete(id);
        return true;
    }
};

module.exports = {
    Query,
    Mutation
}; 