const { OvertimeRate } = require('../../models');

const Query = {
    overtimeRates: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return OvertimeRate.find().sort({ waktuKerja: 1 });
    },

    overtimeRate: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return OvertimeRate.findById(id);
    },

    overtimeRateByWorkHour: async (_, { waktuKerja }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return OvertimeRate.findOne({ waktuKerja });
    }
};

const Mutation = {
    createOvertimeRate: async (_, { waktuKerja, normal, weekend, libur }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const existingRate = await OvertimeRate.findOne({ waktuKerja });
        if (existingRate) {
            throw new Error(`Overtime rate for ${waktuKerja} hours already exists`);
        }

        const overtimeRate = new OvertimeRate({
            waktuKerja,
            normal,
            weekend,
            libur
        });

        return overtimeRate.save();
    },

    updateOvertimeRate: async (_, { id, waktuKerja, normal, weekend, libur }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const updateData = {};
        if (waktuKerja !== undefined) updateData.waktuKerja = waktuKerja;
        if (normal !== undefined) updateData.normal = normal;
        if (weekend !== undefined) updateData.weekend = weekend;
        if (libur !== undefined) updateData.libur = libur;

        const overtimeRate = await OvertimeRate.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!overtimeRate) throw new Error('Overtime rate not found');
        return overtimeRate;
    },

    deleteOvertimeRate: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const result = await OvertimeRate.findByIdAndDelete(id);
        return !!result;
    }
};

module.exports = {
    Query,
    Mutation
}; 