const { Contract } = require('../../models');

const Query = {
    contracts: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Contract.find();
    },
    contract: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Contract.findById(id);
    }
};

const Mutation = {
    createContract: async (_, { contractNo, description, startDate, endDate, vendorName }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const contract = new Contract({ contractNo, description, startDate, endDate, vendorName });
        return contract.save();
    },

    updateContract: async (_, { id, contractNo, description, startDate, endDate, vendorName }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const updateData = { contractNo, description, startDate, endDate, vendorName };
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
        return await Contract.findByIdAndUpdate(id, updateData, { new: true });
    },

    deleteContract: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await Contract.findByIdAndDelete(id);
        return true;
    }
};

module.exports = {
    Query,
    Mutation
}; 