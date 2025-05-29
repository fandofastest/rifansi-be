const { FuelPrice } = require('../../models');

const Query = {
    fuelPrices: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const fuelPrices = await FuelPrice.find().sort({ effectiveDate: -1 });
        return fuelPrices.map(price => ({
            id: price._id,
            fuelType: price.fuelType,
            pricePerLiter: price.pricePerLiter,
            effectiveDate: price.effectiveDate,
            description: price.description
        }));
    },

    fuelPrice: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const price = await FuelPrice.findById(id);
        if (!price) return null;
        return {
            id: price._id,
            fuelType: price.fuelType,
            pricePerLiter: price.pricePerLiter,
            effectiveDate: price.effectiveDate,
            description: price.description
        };
    }
};

const Mutation = {
    createFuelPrice: async (_, { input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const fuelPrice = new FuelPrice({
            ...input,
            effectiveDate: new Date(input.effectiveDate)
        });

        await fuelPrice.save();
        return {
            id: fuelPrice._id,
            fuelType: fuelPrice.fuelType,
            pricePerLiter: fuelPrice.pricePerLiter,
            effectiveDate: fuelPrice.effectiveDate,
            description: fuelPrice.description
        };
    },

    updateFuelPrice: async (_, { id, fuelType, pricePerLiter, effectiveDate, description }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const updateData = {};
        if (fuelType) updateData.fuelType = fuelType;
        if (pricePerLiter) updateData.pricePerLiter = pricePerLiter;
        if (effectiveDate) updateData.effectiveDate = new Date(effectiveDate);
        if (description !== undefined) updateData.description = description;

        const fuelPrice = await FuelPrice.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        if (!fuelPrice) throw new Error('FuelPrice not found');

        return {
            id: fuelPrice._id,
            fuelType: fuelPrice.fuelType,
            pricePerLiter: fuelPrice.pricePerLiter,
            effectiveDate: fuelPrice.effectiveDate,
            description: fuelPrice.description
        };
    },

    deleteFuelPrice: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const result = await FuelPrice.findByIdAndDelete(id);
        return !!result;
    }
};

module.exports = {
    Query,
    Mutation
}; 