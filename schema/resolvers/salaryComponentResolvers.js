const { SalaryComponent, PersonnelRole, OvertimeRate, Holiday } = require('../../models');

const Query = {
    salaryComponents: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return SalaryComponent.find().populate('personnelRole');
    },
    salaryComponent: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return SalaryComponent.findById(id).populate('personnelRole');
    },
    salaryComponentByPersonnelRole: async (_, { personnelRoleId }) => {
        return await SalaryComponent.findOne({ personnelRole: personnelRoleId });
    },
    getSalaryComponentDetails: async (_, { personnelRoleId, date }) => {
        try {
            const salaryComponent = await SalaryComponent.findOne({ personnelRole: personnelRoleId });
            if (!salaryComponent) {
                throw new Error('SalaryComponent tidak ditemukan');
            }
            const dateObj = date ? new Date(date) : new Date();
            return salaryComponent.hitungKomponenGaji(dateObj);
        } catch (error) {
            console.error('Error saat mengambil detail salary component:', error);
            throw error;
        }
    },
    getSalaryComponentDetailWithDate: async (_, { personnelRoleId, date, workHours }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            const salaryComponent = await SalaryComponent.findOne({ personnelRole: personnelRoleId });
            if (!salaryComponent) {
                throw new Error('SalaryComponent tidak ditemukan');
            }

            const dateObj = new Date(date);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

            const isHoliday = await Holiday.findOne({
                date: {
                    $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
                    $lt: new Date(dateObj.getTime() + 24 * 60 * 60 * 1000)
                }
            });

            let dayType = 'normal';
            if (isHoliday) dayType = 'libur';
            else if (isWeekend) dayType = 'weekend';

            const overtimeRate = await OvertimeRate.findOne({ waktuKerja: workHours });
            if (!overtimeRate) {
                throw new Error(`Overtime rate for ${workHours} hours not found`);
            }

            let overtimeMultiplier = 0;
            if (dayType === 'normal') overtimeMultiplier = overtimeRate.normal;
            else if (dayType === 'weekend') overtimeMultiplier = overtimeRate.weekend;
            else if (dayType === 'libur') overtimeMultiplier = overtimeRate.libur;

            const normalHours = 8;
            const lemburHour = Math.max(0, workHours - normalHours);
            const salaryDetail = salaryComponent.hitungKomponenGaji(dateObj);
            const hourlyRate = salaryComponent.gajiPokok / 173;
            const upahLemburHarian = Math.round(hourlyRate * overtimeMultiplier);
            const manpowerHarian = salaryDetail.biayaMPTetapHarian + upahLemburHarian;

            const { upahLemburHarian: ignoredUpahLembur, biayaManpowerHarian, ...restSalaryDetail } = salaryDetail;

            return {
                ...restSalaryDetail,
                isHoliday: !!isHoliday,
                isWeekend,
                dayType,
                overtimeMultiplier,
                workHours,
                upahLemburHarian,
                manpowerHarian
            };
        } catch (error) {
            console.error('Error saat mengambil detail salary component dengan tanggal:', error);
            throw error;
        }
    }
};

const Mutation = {
    createSalaryComponent: async (_, { personnelRoleId, ...args }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const personnelRole = await PersonnelRole.findById(personnelRoleId);
        if (!personnelRole) throw new Error('Personnel Role not found');

        const existingComponent = await SalaryComponent.findOne({ personnelRole: personnelRoleId });
        if (existingComponent) throw new Error('Salary component already exists for this role');

        const salaryComponent = new SalaryComponent({
            ...args,
            personnelRole: personnelRoleId
        });

        return salaryComponent.save();
    },

    updateSalaryComponent: async (_, { id, ...args }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return SalaryComponent.findByIdAndUpdate(id, args, { new: true });
    },

    deleteSalaryComponent: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await SalaryComponent.findByIdAndDelete(id);
        return true;
    }
};

const SalaryComponentResolvers = {
    personnelRole: async (parent) => {
        return PersonnelRole.findById(parent.personnelRole);
    }
};

module.exports = {
    Query,
    Mutation,
    SalaryComponent: SalaryComponentResolvers
}; 