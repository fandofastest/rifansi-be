const { FuelPrice } = require('../../models');

const Query = {
    fuelPrices: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const prices = await FuelPrice.find().sort({ effectiveDate: -1 });
        return prices.map(price => ({
            ...price.toObject(),
            id: price._id,
            effectiveDate: price.effectiveDate.toISOString(),
            createdAt: price.createdAt.toISOString(),
            updatedAt: price.updatedAt.toISOString()
        }));
    },

    fuelPrice: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const price = await FuelPrice.findById(id);
        if (!price) return null;
        return {
            ...price.toObject(),
            id: price._id,
            effectiveDate: price.effectiveDate.toISOString(),
            createdAt: price.createdAt.toISOString(),
            updatedAt: price.updatedAt.toISOString()
        };
    },

    currentFuelPrice: async (_, { fuelType }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const price = await FuelPrice.findOne({ fuelType })
            .sort({ effectiveDate: -1 })
            .limit(1);
        if (!price) return null;
        return {
            ...price.toObject(),
            id: price._id,
            effectiveDate: price.effectiveDate.toISOString(),
            createdAt: price.createdAt.toISOString(),
            updatedAt: price.updatedAt.toISOString()
        };
    },

    fuelPriceByDate: async (_, { fuelType, date }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        // Parse the date and create end of day
        const [year, month, day] = date.split('-').map(Number);
        const endOfDay = new Date(year, month - 1, day + 1);

        console.log('Querying fuel price with params:', {
            fuelType,
            date,
            endOfDay: endOfDay.toISOString()
        });

        // Find the most recent fuel price that was effective on or before the given date
        const price = await FuelPrice.findOne({
            fuelType,
            effectiveDate: { $lt: endOfDay }
        }).sort({ effectiveDate: -1 });

        console.log('Query result:', price);

        if (!price) {
            // If no price found, let's check what prices exist in the database
            const allPrices = await FuelPrice.find({ fuelType }).sort({ effectiveDate: -1 });
            console.log('All prices for this fuel type:', allPrices);
            return null;
        }

        return {
            ...price.toObject(),
            id: price._id,
            effectiveDate: price.effectiveDate.toISOString(),
            createdAt: price.createdAt.toISOString(),
            updatedAt: price.updatedAt.toISOString()
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
            ...fuelPrice.toObject(),
            id: fuelPrice._id,
            effectiveDate: fuelPrice.effectiveDate.toISOString(),
            createdAt: fuelPrice.createdAt.toISOString(),
            updatedAt: fuelPrice.updatedAt.toISOString()
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
            ...fuelPrice.toObject(),
            id: fuelPrice._id,
            effectiveDate: fuelPrice.effectiveDate.toISOString(),
            createdAt: fuelPrice.createdAt.toISOString(),
            updatedAt: fuelPrice.updatedAt.toISOString()
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