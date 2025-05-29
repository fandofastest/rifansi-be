const { Unit } = require('../../models');

const Query = {
    units: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Unit.find().sort({ name: 1 });
    },

    unit: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Unit.findById(id);
    }
};

const Mutation = {
    createUnit: async (_, { code, name, description }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        // Periksa apakah unit dengan code yang sama sudah ada
        const existingUnit = await Unit.findOne({ code });
        if (existingUnit) {
            throw new Error('Unit with this code already exists');
        }

        const unit = new Unit({
            code,
            name,
            description
        });

        return unit.save();
    },

    updateUnit: async (_, { id, code, name, description }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        // Jika code diubah, periksa apakah code baru sudah digunakan
        if (code) {
            const existingUnit = await Unit.findOne({ code, _id: { $ne: id } });
            if (existingUnit) {
                throw new Error('Unit with this code already exists');
            }
        }

        const updateData = {};
        if (code !== undefined) updateData.code = code;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const unit = await Unit.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!unit) throw new Error('Unit not found');
        return unit;
    },

    deleteUnit: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const result = await Unit.findByIdAndDelete(id);
        return !!result;
    }
};

const UnitResolvers = {
    id: (parent) => parent._id || parent.id
};

module.exports = {
    Query,
    Mutation,
    Unit: UnitResolvers
}; 