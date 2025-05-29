const { Holiday, User } = require('../../models');
const axios = require('axios');

const Query = {
    holidays: async (_, { startDate, endDate }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        let query = {};
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        return Holiday.find(query).sort({ date: 1 }).populate('createdBy');
    },

    holiday: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Holiday.findById(id).populate('createdBy');
    },

    holidayByDate: async (_, { date }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(queryDate);
        nextDay.setDate(nextDay.getDate() + 1);

        return Holiday.findOne({
            date: {
                $gte: queryDate,
                $lt: nextDay
            }
        }).populate('createdBy');
    },

    isHoliday: async (_, { date }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(queryDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const isSunday = queryDate.getDay() === 0;
        const holiday = await Holiday.findOne({
            date: {
                $gte: queryDate,
                $lt: nextDay
            }
        });

        return isSunday || !!holiday;
    }
};

const Mutation = {
    createHoliday: async (_, { date, name, description, isNational = true }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const holidayDate = new Date(date);
        holidayDate.setHours(0, 0, 0, 0);

        const existingHoliday = await Holiday.findOne({
            date: {
                $gte: holidayDate,
                $lt: new Date(holidayDate.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (existingHoliday) throw new Error('Holiday already exists for this date');

        const holiday = new Holiday({
            date: holidayDate,
            name,
            description,
            isNational,
            createdBy: user.userId
        });

        return holiday.save();
    },

    updateHoliday: async (_, { id, date, ...args }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const updateData = { ...args };

        if (date) {
            const holidayDate = new Date(date);
            holidayDate.setHours(0, 0, 0, 0);
            updateData.date = holidayDate;

            const existingHoliday = await Holiday.findOne({
                _id: { $ne: id },
                date: {
                    $gte: holidayDate,
                    $lt: new Date(holidayDate.getTime() + 24 * 60 * 60 * 1000)
                }
            });

            if (existingHoliday) throw new Error('Another holiday already exists for this date');
        }

        return Holiday.findByIdAndUpdate(id, updateData, { new: true });
    },

    deleteHoliday: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await Holiday.findByIdAndDelete(id);
        return true;
    },

    importHolidays: async (_, { year }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            const currentYear = year || new Date().getFullYear();
            const response = await axios.get(`https://api-harilibur.vercel.app/api?year=${currentYear}`);
            const holidaysData = response.data;

            if (!Array.isArray(holidaysData) || holidaysData.length === 0) {
                return {
                    success: false,
                    message: `No holidays found for year ${currentYear}`,
                    importedCount: 0,
                    skippedCount: 0
                };
            }

            return processHolidaysImport(holidaysData, user.userId);
        } catch (error) {
            console.error('Error importing holidays from API:', error);
            return {
                success: false,
                message: `Error importing holidays: ${error.message}`,
                importedCount: 0,
                skippedCount: 0
            };
        }
    },

    importHolidaysFromData: async (_, { holidays }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            if (!Array.isArray(holidays) || holidays.length === 0) {
                return {
                    success: false,
                    message: 'No holidays data provided',
                    importedCount: 0,
                    skippedCount: 0
                };
            }

            return processHolidaysImport(holidays, user.userId);
        } catch (error) {
            console.error('Error importing holidays from data:', error);
            return {
                success: false,
                message: `Error importing holidays: ${error.message}`,
                importedCount: 0,
                skippedCount: 0
            };
        }
    }
};

const HolidayResolvers = {
    createdBy: async (parent) => {
        if (!parent.createdBy) return null;
        return User.findById(parent.createdBy);
    }
};

module.exports = {
    Query,
    Mutation,
    Holiday: HolidayResolvers
}; 