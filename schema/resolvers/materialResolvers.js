const { Material, Unit } = require('../../models');

const Query = {
    materials: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const materials = await Material.find().populate('unitId');
        return materials.map(material => ({
            id: material._id,
            name: material.name,
            unitId: material.unitId._id,
            unitRate: material.unitRate,
            description: material.description,
            unit: {
                id: material.unitId._id,
                code: material.unitId.code,
                name: material.unitId.name,
                description: material.unitId.description
            }
        }));
    },

    material: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const material = await Material.findById(id).populate('unitId');
        if (!material) return null;
        return {
            id: material._id,
            name: material.name,
            unitId: material.unitId._id,
            unitRate: material.unitRate,
            description: material.description,
            unit: {
                id: material.unitId._id,
                code: material.unitId.code,
                name: material.unitId.name,
                description: material.unitId.description
            }
        };
    }
};

const Mutation = {
    createMaterial: async (_, { name, unitId, unitRate, description }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const unit = await Unit.findById(unitId);
        if (!unit) throw new Error('Unit not found');

        const material = new Material({
            name,
            unitId,
            unitRate,
            description
        });

        const savedMaterial = await material.save();
        return {
            id: savedMaterial._id,
            name: savedMaterial.name,
            unitId: unit._id,
            unitRate: savedMaterial.unitRate,
            description: savedMaterial.description,
            unit: {
                id: unit._id,
                code: unit.code,
                name: unit.name,
                description: unit.description
            }
        };
    },

    updateMaterial: async (_, { id, name, unitId, unitRate, description }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        let unit = null;
        if (unitId) {
            unit = await Unit.findById(unitId);
            if (!unit) throw new Error('Unit not found');
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (unitId) updateData.unitId = unitId;
        if (unitRate !== undefined) updateData.unitRate = unitRate;
        if (description !== undefined) updateData.description = description;

        const material = await Material.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('unitId');

        if (!material) throw new Error('Material not found');

        return {
            id: material._id,
            name: material.name,
            unitId: material.unitId._id,
            unitRate: material.unitRate,
            description: material.description,
            unit: {
                id: material.unitId._id,
                code: material.unitId.code,
                name: material.unitId.name,
                description: material.unitId.description
            }
        };
    },

    deleteMaterial: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await Material.findByIdAndDelete(id);
        return true;
    }
};

const MaterialResolvers = {
    id: (parent) => parent._id || parent.id,
    unit: async (parent) => {
        const unit = await Unit.findById(parent.unitId);
        if (!unit) return null;
        return {
            id: unit._id,
            code: unit.code,
            name: unit.name,
            description: unit.description
        };
    }
};

const UnitResolvers = {
    id: (parent) => parent._id || parent.id
};

module.exports = {
    Query,
    Mutation,
    Material: MaterialResolvers,
    Unit: UnitResolvers
}; 