const {
    DailyActivity,
    ActivityDetail,
    EquipmentLog,
    ManpowerLog,
    MaterialUsageLog,
    OtherCost,
    Area,
    Equipment,
    Material,
    PersonnelRole,
    SPK,
    WorkItem,
    User,
    FuelPrice
} = require('../../models');

const {
    calculateDailyPhysicalProgress,
    calculateDailyFinancialProgress,
    calculateDailyCosts,
    calculateProgressPercentage,
    calculateBOQProgressPercentage,
    calculateBudgetUsagePercentage
} = require('./helpers');

const Query = {
    dailyActivities: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return DailyActivity.find()
            .populate('spkId')
            .populate('contractId')
            .populate('createdBy');
    },

    dailyActivity: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return DailyActivity.findById(id)
            .populate('spkId')
            .populate('contractId')
            .populate('createdBy');
    },

    dailyActivitiesBySPK: async (_, { spkId }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return DailyActivity.find({ spkId })
            .populate('spkId')
            .populate('contractId')
            .populate('createdBy');
    },

    dailyActivitiesByDate: async (_, { date }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return DailyActivity.find({ date })
            .populate('spkId')
            .populate('contractId')
            .populate('createdBy');
    },

    dailyActivitiesByUser: async (_, { userId }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return DailyActivity.find({ createdBy: userId })
            .populate('spkId')
            .populate('contractId')
            .populate('createdBy');
    },

    // Fast query for user's own daily activities with pagination
    getMyDailyActivity: async (_, { limit = 10, skip = 0, startDate, endDate }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            console.log('getMyDailyActivity - User object keys:', Object.keys(user));
            console.log('getMyDailyActivity - User object:', { 
                id: user.id, 
                _id: user._id,
                userId: user.userId,
                username: user.username 
            });

            // Try multiple ways to get user ID
            const userId = user.id || user._id || user.userId;
            console.log('getMyDailyActivity - Using userId:', userId, 'Type:', typeof userId);

            // Build query filter for user's own activities
            const query = { createdBy: userId };
            console.log('getMyDailyActivity - Query filter:', query);

            // Add date filters if provided
            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = new Date(startDate);
                if (endDate) query.date.$lte = new Date(endDate);
            }

            // Debug: Let's see what activities exist in the database
            const allActivities = await DailyActivity.find({}).limit(3).select('createdBy');
            console.log('getMyDailyActivity - Sample activities createdBy:', allActivities.map(a => ({ 
                id: a._id, 
                createdBy: a.createdBy, 
                createdByType: typeof a.createdBy 
            })));

            // Debug: Check what activities exist for this user using string conversion
            const userActivitiesString = await DailyActivity.find({ 
                createdBy: userId.toString() 
            }).limit(3).select('createdBy');
            console.log('getMyDailyActivity - User activities (string):', userActivitiesString.length);

            // Debug: Check using ObjectId if available
            const mongoose = require('mongoose');
            let userActivitiesObjectId = [];
            if (mongoose.Types.ObjectId.isValid(userId)) {
                userActivitiesObjectId = await DailyActivity.find({ 
                    createdBy: new mongoose.Types.ObjectId(userId) 
                }).limit(3).select('createdBy');
                console.log('getMyDailyActivity - User activities (ObjectId):', userActivitiesObjectId.length);
            }

            // Use the appropriate format based on what works
            let finalQuery = query;
            if (userActivitiesString.length > 0) {
                finalQuery = { ...query, createdBy: userId.toString() };
            } else if (userActivitiesObjectId.length > 0) {
                finalQuery = { ...query, createdBy: new mongoose.Types.ObjectId(userId) };
            }

            console.log('getMyDailyActivity - Final query:', finalQuery);

            // Get total count for pagination
            const totalCount = await DailyActivity.countDocuments(finalQuery);
            console.log('getMyDailyActivity - Total count:', totalCount);

            // Calculate pagination info
            const currentPage = Math.floor(skip / limit) + 1;
            const totalPages = Math.ceil(totalCount / limit);
            const hasMore = skip + limit < totalCount;

            // Get activities with pagination - only populate basic SPK info for speed
            const activities = await DailyActivity.find(finalQuery)
                .populate({
                    path: 'spkId',
                    select: 'spkNo title projectName startDate endDate'
                })
                .populate('areaId')
                .select('date location weather status workStartTime workEndTime closingRemarks isApproved createdBy createdAt updatedAt areaId')
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit);

            console.log('getMyDailyActivity - Activities found:', activities.length);

            return {
                activities: activities.map(activity => ({
                    id: activity._id,
                    date: activity.date,
                    location: activity.location,
                    weather: activity.weather,
                    status: activity.status,
                    workStartTime: activity.workStartTime,
                    workEndTime: activity.workEndTime,
                    closingRemarks: activity.closingRemarks,
                    isApproved: activity.isApproved,
                    area: activity.areaId,
                    spk: activity.spkId,
                    user: user,
                    createdAt: activity.createdAt,
                    updatedAt: activity.updatedAt
                })),
                totalCount,
                hasMore,
                currentPage,
                totalPages
            };
        } catch (error) {
            console.error('Error in getMyDailyActivity:', error);
            throw new Error('Terjadi kesalahan saat mengambil data laporan aktivitas harian');
        }
    },

    // Get activities by area with pagination - similar to getMyDailyActivity but filtered by area
    getActivityByArea: async (_, { areaId, limit = 10, skip = 0, startDate, endDate }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            console.log('getActivityByArea - areaId:', areaId);
            console.log('getActivityByArea - User:', { 
                id: user.id, 
                _id: user._id,
                userId: user.userId,
                username: user.username 
            });

            // Build query filter for activities in specified area
            const query = { areaId: areaId };
            console.log('getActivityByArea - Query filter:', query);

            // Add date filters if provided
            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = new Date(startDate);
                if (endDate) query.date.$lte = new Date(endDate);
            }

            console.log('getActivityByArea - Final query:', query);

            // Get total count for pagination
            const totalCount = await DailyActivity.countDocuments(query);
            console.log('getActivityByArea - Total count:', totalCount);

            // Calculate pagination info
            const currentPage = Math.floor(skip / limit) + 1;
            const totalPages = Math.ceil(totalCount / limit);
            const hasMore = skip + limit < totalCount;

            // Get activities with pagination - only populate basic SPK info for speed
            const activities = await DailyActivity.find(query)
                .populate({
                    path: 'spkId',
                    select: 'spkNo title projectName startDate endDate'
                })
                .populate('areaId')
                .populate('createdBy', 'username fullName') // Also populate user info for area view
                .select('date location weather status workStartTime workEndTime closingRemarks isApproved createdBy createdAt updatedAt areaId')
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit);

            console.log('getActivityByArea - Activities found:', activities.length);

            return {
                activities: activities.map(activity => ({
                    id: activity._id,
                    date: activity.date,
                    location: activity.location,
                    weather: activity.weather,
                    status: activity.status,
                    workStartTime: activity.workStartTime,
                    workEndTime: activity.workEndTime,
                    closingRemarks: activity.closingRemarks,
                    isApproved: activity.isApproved,
                    area: activity.areaId,
                    spk: activity.spkId,
                    user: activity.createdBy, // Include user info for area view
                    createdAt: activity.createdAt,
                    updatedAt: activity.updatedAt
                })),
                totalCount,
                hasMore,
                currentPage,
                totalPages
            };
        } catch (error) {
            console.error('Error in getActivityByArea:', error);
            throw new Error('Terjadi kesalahan saat mengambil data laporan aktivitas berdasarkan area');
        }
    },

    // Simple debug query - just for testing user filter
    getMyDailyActivityDebug: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        
        try {
            console.log('DEBUG - User:', user);
            
            // Test different user ID formats
            const userIdFormats = [
                user.id,
                user._id,
                user.userId,
                user.id?.toString(),
                user._id?.toString()
            ].filter(Boolean);
            
            console.log('DEBUG - Testing user ID formats:', userIdFormats);
            
            for (const userId of userIdFormats) {
                const count = await DailyActivity.countDocuments({ createdBy: userId });
                console.log(`DEBUG - userId: ${userId} (${typeof userId}) -> count: ${count}`);
                
                if (count > 0) {
                    const sample = await DailyActivity.findOne({ createdBy: userId });
                    return {
                        success: true,
                        message: `Found ${count} activities with userId: ${userId}`,
                        userIdUsed: userId,
                        userIdType: typeof userId,
                        sampleActivity: {
                            id: sample._id,
                            date: sample.date,
                            createdBy: sample.createdBy
                        }
                    };
                }
            }
            
            return {
                success: false,
                message: 'No activities found with any user ID format',
                userIdFormats: userIdFormats
            };
        } catch (error) {
            console.error('Error in debug query:', error);
            return {
                success: false,
                message: error.message,
                error: error.toString()
            };
        }
    },
    // Consolidated function to get daily activities with details
    getDailyActivityWithDetails: async (_, { areaId, userId, activityId, spkId, startDate, endDate }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            // Build query filter
            const query = {};
            if (activityId) query._id = activityId;
            if (areaId) query.areaId = areaId;
            if (userId) query.createdBy = userId;
            if (spkId) query.spkId = spkId;
            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = new Date(startDate);
                if (endDate) query.date.$lte = new Date(endDate);
            }

            // Get daily activities with populated data
            const dailyActivities = await DailyActivity.find(query)
                .populate('spkId')
                .populate('createdBy')
                .populate('areaId')
                .populate('approvedBy')
                .sort({ date: -1 });

            if (dailyActivities.length === 0) return [];

            const dailyActivityIds = dailyActivities.map(da => da._id);

            // Ambil semua detail terkait sekaligus
            const [activityDetails, equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts, latestFuelPrice] = await Promise.all([
                ActivityDetail.find({ dailyActivityId: { $in: dailyActivityIds } })
                    .populate({
                        path: 'workItemId',
                        populate: {
                            path: 'unitId',
                            select: 'name code'
                        }
                    }),
                EquipmentLog.find({ dailyActivityId: { $in: dailyActivityIds } })
                    .populate('equipmentId'),
                ManpowerLog.find({ dailyActivityId: { $in: dailyActivityIds }, isActive: true })
                    .populate('role'),
                MaterialUsageLog.find({ dailyActivityId: { $in: dailyActivityIds } })
                    .populate('materialId'),
                OtherCost.find({ dailyActivityId: { $in: dailyActivityIds } }),
                FuelPrice.findOne().sort({ effectiveDate: -1 })
            ]);

            // Helper untuk group by dailyActivityId
            const groupBy = (arr, key) => arr.reduce((acc, item) => {
                const k = item[key]?.toString();
                if (!k) return acc;
                if (!acc[k]) acc[k] = [];
                acc[k].push(item);
                return acc;
            }, {});

            const activityDetailsByDA = groupBy(activityDetails, 'dailyActivityId');
            const equipmentLogsByDA = groupBy(equipmentLogs, 'dailyActivityId');
            const manpowerLogsByDA = groupBy(manpowerLogs, 'dailyActivityId');
            const materialUsageLogsByDA = groupBy(materialUsageLogs, 'dailyActivityId');
            const otherCostsByDA = groupBy(otherCosts, 'dailyActivityId');

            // Bangun respons seperti sebelumnya
            const result = await Promise.all(
                dailyActivities.map(async (da) => {
                    const daId = da._id.toString();
                    const activityDetails = activityDetailsByDA[daId] || [];
                    const equipmentLogs = equipmentLogsByDA[daId] || [];
                    const manpowerLogs = manpowerLogsByDA[daId] || [];
                    const materialUsageLogs = materialUsageLogsByDA[daId] || [];
                    const otherCosts = otherCostsByDA[daId] || [];

                    // Perhitungan progress harian berbasis SALES: (nominal sales hari ini) / (target harian sales)
                    // Target harian sales = (budget SPK) / (jumlah hari kerja)
                    let progressPercentage = 0;
                    if (da.spkId && da.spkId.workItems && da.spkId.startDate && da.spkId.endDate) {
                        const startDate = new Date(da.spkId.startDate);
                        const endDate = new Date(da.spkId.endDate);
                        const totalWorkDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

                        // Build SPK-local rates map: workItemId -> { nrRate, rRate }
                        const spkWiRateMap = new Map();
                        for (const wi of (da.spkId.workItems || [])) {
                            const wid = wi.workItemId && (wi.workItemId._id || wi.workItemId);
                            if (!wid) continue;
                            const key = wid.toString();
                            const nrRate = wi.rates?.nr?.rate || 0;
                            const rRate = wi.rates?.r?.rate || 0;
                            spkWiRateMap.set(key, { nrRate, rRate });
                        }

                        // Hitung nominal sales eksekusi untuk AKTIVITAS INI (hari ini)
                        let executedSalesToday = 0;
                        for (const detail of activityDetails) {
                            const workItemIdStr = detail.workItemId?._id?.toString?.() || detail.workItemId?.toString?.();
                            if (!workItemIdStr) continue;
                            const ratesFromSpk = spkWiRateMap.get(workItemIdStr);
                            const nrRate = (ratesFromSpk?.nrRate) ?? (detail.rates?.nr?.rate || 0);
                            const rRate = (ratesFromSpk?.rRate) ?? (detail.rates?.r?.rate || 0);
                            const nrQty = detail.actualQuantity?.nr || 0;
                            const rQty = detail.actualQuantity?.r || 0;
                            executedSalesToday += (nrQty * nrRate) + (rQty * rRate);
                        }

                        // Target harian sales = budget / totalWorkDays
                        const budget = da.spkId.budget || 0;
                        const targetSalesHarian = totalWorkDays > 0 ? (budget / totalWorkDays) : 0;

                        progressPercentage = targetSalesHarian > 0 ? (executedSalesToday / targetSalesHarian) * 100 : 0;
                        progressPercentage = Math.round(progressPercentage * 100) / 100;
                    }

                    // Calculate budget usage based on total daily costs instead of item work
                    let equipmentTotal = 0;
                    const fallbackFuelPrice = latestFuelPrice ? (latestFuelPrice.pricePerLiter || 0) : 0;
                    if (Array.isArray(equipmentLogs)) {
                        equipmentTotal = equipmentLogs.reduce((sum, log) => {
                            const effectiveFuelPrice = (log.fuelPrice && log.fuelPrice > 0) ? log.fuelPrice : fallbackFuelPrice;
                            const fuelCost = (log.fuelIn || 0) * effectiveFuelPrice;
                            let rentalCost = 0;
                            if (log.rentalRatePerDay && log.rentalRatePerDay > 0) {
                                const workingHour = (log.workingHour || log.workingHours || 0);
                                const days = workingHour >= 8 ? 1 : (workingHour / 8);
                                rentalCost = days * log.rentalRatePerDay;
                            } else if (log.hourlyRate && log.workingHour) {
                                // Fallback if daily rate not provided
                                rentalCost = (log.hourlyRate || 0) * (log.workingHour || 0);
                            }
                            return sum + fuelCost + rentalCost;
                        }, 0);
                    }

                    let manpowerTotal = 0;
                    if (Array.isArray(manpowerLogs)) {
                        manpowerTotal = manpowerLogs.reduce((sum, ml) => {
                            const cost = (ml.personCount || 0) * (ml.hourlyRate || 0) * (ml.workingHours || 0);
                            return sum + (isNaN(cost) ? 0 : cost);
                        }, 0);
                    }

                    let materialTotal = 0;
                    if (Array.isArray(materialUsageLogs)) {
                        materialTotal = materialUsageLogs.reduce((sum, mu) => {
                            const cost = (mu.quantity || 0) * (mu.unitRate || 0);
                            return sum + (isNaN(cost) ? 0 : cost);
                        }, 0);
                    }

                    let otherTotal = 0;
                    if (Array.isArray(otherCosts)) {
                        otherTotal = otherCosts.reduce((sum, oc) => sum + (oc.amount || 0), 0);
                    }

                    const totalDailyCost = equipmentTotal + manpowerTotal + materialTotal + otherTotal;

                    // Daily budget target from SPK budget divided by inclusive workdays
                    let dailyTarget = 0;
                    if (da.spkId && (da.spkId.startDate && da.spkId.endDate)) {
                        const s = new Date(da.spkId.startDate);
                        const e = new Date(da.spkId.endDate);
                        const totalDays = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
                        const totalBudget = da.spkId.budget || 0;
                        dailyTarget = totalBudget / totalDays;
                    }

                    const budgetUsage = dailyTarget > 0 ? (totalDailyCost / dailyTarget) * 100 : 0;

                    return {
                        id: da._id,
                        date: da.date,
                        area: da.areaId ? {
                            id: da.areaId._id,
                            name: da.areaId.name,
                            location: da.areaId.location
                        } : null,
                        location: da.location,
                        weather: da.weather,
                        status: da.status,
                        workStartTime: da.workStartTime,
                        workEndTime: da.workEndTime,
                        startImages: da.startImages || [],
                        finishImages: da.finishImages || [],
                        closingRemarks: da.closingRemarks,
                        isApproved: da.isApproved,
                        approvedBy: da.approvedBy,
                        approvedAt: da.approvedAt,
                        rejectionReason: da.rejectionReason,
                        progressPercentage,
                        budgetUsage,
                        activityDetails: activityDetails.map(detail => {
                            if (!detail || !detail.workItemId) return null;
                            try {
                                // Definisi default rates jika tidak ada di ActivityDetail atau SPK
                                const defaultRates = {
                                    nr: { rate: 0, description: 'Non-remote rate' },
                                    r: { rate: 0, description: 'Remote rate' }
                                };
                                // Ambil rates langsung dari SPK berdasarkan workItemId
                                let spkRates = defaultRates;
                                try {
                                    const wiIdStr = detail.workItemId?._id?.toString?.() || detail.workItemId?.toString?.() || '';
                                    const wiArr = Array.isArray(da?.spkId?.workItems) ? da.spkId.workItems : [];
                                    if (wiIdStr && wiArr.length > 0) {
                                        const wiFromSpk = wiArr.find(wi => {
                                            const id = wi.workItemId && (wi.workItemId._id || wi.workItemId);
                                            return id && id.toString() === wiIdStr;
                                        });
                                        if (wiFromSpk && wiFromSpk.rates) {
                                            const nrRate = wiFromSpk.rates?.nr?.rate || 0;
                                            const rRate = wiFromSpk.rates?.r?.rate || 0;
                                            spkRates = {
                                                nr: { rate: nrRate, description: wiFromSpk.rates?.nr?.description },
                                                r: { rate: rRate, description: wiFromSpk.rates?.r?.description }
                                            };
                                        }
                                    }
                                } catch (_) { /* noop */ }

                                return {
                                    ...detail.toObject(),
                                    // Override top-level rates to use SPK rates for consistency
                                    rates: spkRates,
                                    workItem: detail.workItemId ? {
                                        ...detail.workItemId.toObject(),
                                        unit: detail.workItemId.unitId,
                                        // Gunakan rates dari SPK langsung
                                        rates: spkRates
                                    } : null
                                };
                            } catch (error) {
                                console.error('Error processing activity detail:', error);
                                return null;
                            }
                        }).filter(Boolean),
                        equipmentLogs: equipmentLogs.map(log => {
                            if (!log) return null;
                            try {
                                return {
                                    id: log._id,
                                    equipmentId: log.equipmentId,
                                    equipment: log.equipmentId,
                                    fuelIn: log.fuelIn,
                                    fuelRemaining: log.fuelRemaining,
                                    workingHour: log.workingHour,
                                    hourlyRate: log.hourlyRate,
                                    rentalRatePerDay: log.rentalRatePerDay,
                                    fuelPrice: latestFuelPrice ? latestFuelPrice.pricePerLiter : 0,
                                    isBrokenReported: log.isBrokenReported,
                                    brokenDescription: log.brokenDescription,
                                    remarks: log.remarks
                                };
                            } catch (error) {
                                console.error('Error processing equipment log:', error);
                                return null;
                            }
                        }).filter(Boolean),
                        manpowerLogs: manpowerLogs.filter(Boolean),
                        materialUsageLogs: materialUsageLogs.filter(Boolean),
                        otherCosts: otherCosts.filter(Boolean),
                        spkDetail: da.spkId,
                        userDetail: da.createdBy,
                        createdAt: da.createdAt,
                        updatedAt: da.updatedAt
                    };
                })
            );
            return result;
        } catch (error) {
            console.error('Error in getDailyActivityWithDetails:', error);
            throw new Error('Terjadi kesalahan saat mengambil data laporan harian');
        }
    },

    // Get single daily activity with details by activity ID - focused for detail view
    getDailyActivityWithDetailsByActivityId: async (_, { activityId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            console.log('getDailyActivityWithDetailsByActivityId - activityId:', activityId);

            // Get daily activity with populated data
            const dailyActivity = await DailyActivity.findById(activityId)
                .populate({
                    path: 'spkId',
                    populate: {
                        path: 'workItems.workItemId',
                        select: 'name description unitId categoryId subCategoryId',
                        populate: [
                            {
                                path: 'unitId',
                                select: 'name code'
                            },
                            {
                                path: 'categoryId',
                                select: 'name'
                            },
                            {
                                path: 'subCategoryId',
                                select: 'name'
                            }
                        ]
                    }
                })
                .populate('createdBy')
                .populate('areaId')
                .populate('approvedBy');

            if (!dailyActivity) {
                console.log('Daily activity not found');
                return null;
            }

            console.log('Daily activity found:', dailyActivity._id);

            // Get latest fuel price for equipment calculations
            const latestFuelPrice = await FuelPrice.findOne()
                .sort({ effectiveDate: -1 });

            // Get all related data for this activity
            const activityDetails = await ActivityDetail.find({ dailyActivityId: dailyActivity._id })
                .populate({
                    path: 'workItemId',
                    populate: {
                        path: 'unitId',
                        select: 'name code'
                    }
                });

            const equipmentLogs = await EquipmentLog.find({ dailyActivityId: dailyActivity._id })
                .populate('equipmentId');

            const manpowerLogs = await ManpowerLog.find({
                dailyActivityId: dailyActivity._id,
                isActive: true
            }).populate('role');

            const materialUsageLogs = await MaterialUsageLog.find({ dailyActivityId: dailyActivity._id })
                .populate('materialId');

            const otherCosts = await OtherCost.find({ dailyActivityId: dailyActivity._id });

            // Calculate progress percentage
            let progressPercentage = 0;
            if (dailyActivity.spkId && dailyActivity.spkId.workItems) {
                const totalBoqNr = dailyActivity.spkId.workItems.reduce((sum, item) => sum + (item.boqVolume.nr || 0), 0);
                const totalBoqR = dailyActivity.spkId.workItems.reduce((sum, item) => sum + (item.boqVolume.r || 0), 0);
                const totalBoqVolume = totalBoqNr + totalBoqR;

                const totalActualNr = activityDetails.reduce((sum, detail) => sum + (detail.actualQuantity.nr || 0), 0);
                const totalActualR = activityDetails.reduce((sum, detail) => sum + (detail.actualQuantity.r || 0), 0);
                const totalActualVolume = totalActualNr + totalActualR;

                progressPercentage = totalBoqVolume > 0 ? (totalActualVolume / totalBoqVolume) * 100 : 0;
            }

            // Calculate daily progress (NEW)
            let dailyProgress = null;
            if (dailyActivity.spkId && dailyActivity.spkId.workItems && dailyActivity.spkId.startDate && dailyActivity.spkId.endDate) {
                // Calculate total working days
                const startDate = new Date(dailyActivity.spkId.startDate);
                const endDate = new Date(dailyActivity.spkId.endDate);
                const totalWorkDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

                // Calculate total BOQ volume from SPK
                const totalBOQNr = dailyActivity.spkId.workItems.reduce((total, item) => total + (item.boqVolume?.nr || 0), 0);
                const totalBOQR = dailyActivity.spkId.workItems.reduce((total, item) => total + (item.boqVolume?.r || 0), 0);
                const totalBOQVolume = totalBOQNr + totalBOQR;

                // Calculate daily target BOQ
                const dailyTargetNr = totalBOQNr / totalWorkDays;
                const dailyTargetR = totalBOQR / totalWorkDays;
                const dailyTargetTotal = totalBOQVolume / totalWorkDays;

                // Calculate actual BOQ for this day
                const actualNr = activityDetails.reduce((total, detail) => total + (detail.actualQuantity?.nr || 0), 0);
                const actualR = activityDetails.reduce((total, detail) => total + (detail.actualQuantity?.r || 0), 0);
                const actualTotal = actualNr + actualR;

                // Calculate daily progress percentage
                const dailyProgressPercentage = dailyTargetTotal > 0 ? (actualTotal / dailyTargetTotal) * 100 : 0;

                // Calculate work item progress
                const workItemProgress = dailyActivity.spkId.workItems.map(spkWorkItem => {
                    // Find corresponding activity detail
                    const relatedDetail = activityDetails.find(detail => 
                        detail.workItemId && detail.workItemId._id.toString() === (spkWorkItem.workItemId._id || spkWorkItem.workItemId).toString()
                    );

                    // Calculate target BOQ for this work item per day
                    const itemTargetNr = (spkWorkItem.boqVolume?.nr || 0) / totalWorkDays;
                    const itemTargetR = (spkWorkItem.boqVolume?.r || 0) / totalWorkDays;
                    const itemTargetTotal = itemTargetNr + itemTargetR;

                    // Get actual BOQ for this work item
                    const itemActualNr = relatedDetail?.actualQuantity?.nr || 0;
                    const itemActualR = relatedDetail?.actualQuantity?.r || 0;
                    const itemActualTotal = itemActualNr + itemActualR;

                    // Calculate progress percentage for this work item
                    const itemProgressPercentage = itemTargetTotal > 0 ? (itemActualTotal / itemTargetTotal) * 100 : 0;

                    return {
                        workItemId: spkWorkItem.workItemId._id || spkWorkItem.workItemId,
                        workItemName: spkWorkItem.workItemId?.name || 'Unknown Work Item',
                        targetBOQ: {
                            nr: Math.round(itemTargetNr * 100) / 100,
                            r: Math.round(itemTargetR * 100) / 100,
                            total: Math.round(itemTargetTotal * 100) / 100
                        },
                        actualBOQ: {
                            nr: itemActualNr,
                            r: itemActualR,
                            total: itemActualTotal
                        },
                        progressPercentage: Math.round(itemProgressPercentage * 100) / 100,
                        unit: spkWorkItem.workItemId?.unitId || null
                    };
                });

                dailyProgress = {
                    totalDailyTargetBOQ: {
                        nr: Math.round(dailyTargetNr * 100) / 100,
                        r: Math.round(dailyTargetR * 100) / 100,
                        total: Math.round(dailyTargetTotal * 100) / 100
                    },
                    totalActualBOQ: {
                        nr: actualNr,
                        r: actualR,
                        total: actualTotal
                    },
                    dailyProgressPercentage: Math.round(dailyProgressPercentage * 100) / 100,
                    workItemProgress: workItemProgress
                };
            }

            // Calculate budget usage
            const equipmentCosts = equipmentLogs.reduce((sum, log) => {
                const fuelCost = (log.fuelIn || 0) * (latestFuelPrice ? latestFuelPrice.pricePerLiter : 0);
                const rentalCost = (log.workingHour || 0) * (log.hourlyRate || 0);
                return sum + fuelCost + rentalCost;
            }, 0);

            const manpowerCosts = manpowerLogs.reduce((sum, log) => {
                return sum + ((log.personCount || 0) * (log.workingHours || 0) * (log.hourlyRate || 0));
            }, 0);

            const materialCosts = materialUsageLogs.reduce((sum, log) => {
                return sum + ((log.quantity || 0) * (log.unitRate || 0));
            }, 0);

            const otherCostTotal = otherCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0);

            const totalCosts = equipmentCosts + manpowerCosts + materialCosts + otherCostTotal;
            const budgetUsage = dailyActivity.spkId && dailyActivity.spkId.budget > 0 ? 
                (totalCosts / dailyActivity.spkId.budget) * 100 : 0;

            console.log('Processed activity details:', activityDetails.length);

            return {
                id: dailyActivity._id,
                date: dailyActivity.date,
                area: dailyActivity.areaId ? {
                    id: dailyActivity.areaId._id,
                    name: dailyActivity.areaId.name,
                    location: dailyActivity.areaId.location
                } : null,
                location: dailyActivity.location,
                weather: dailyActivity.weather,
                status: dailyActivity.status,
                workStartTime: dailyActivity.workStartTime,
                workEndTime: dailyActivity.workEndTime,
                startImages: dailyActivity.startImages || [],
                finishImages: dailyActivity.finishImages || [],
                closingRemarks: dailyActivity.closingRemarks,
                isApproved: dailyActivity.isApproved,
                approvedBy: dailyActivity.approvedBy,
                approvedAt: dailyActivity.approvedAt,
                rejectionReason: dailyActivity.rejectionReason,
                progressPercentage,
                budgetUsage,
                activityDetails: activityDetails,   
                equipmentLogs: equipmentLogs.map(log => {
                    if (!log) return null;
                    try {
                        return {
                            id: log._id,
                            equipmentId: log.equipmentId,
                            equipment: log.equipmentId,
                            fuelIn: log.fuelIn,
                            fuelRemaining: log.fuelRemaining,
                            workingHour: log.workingHour,
                            hourlyRate: log.hourlyRate,
                            rentalRatePerDay: log.rentalRatePerDay,
                            fuelPrice: latestFuelPrice ? latestFuelPrice.pricePerLiter : 0,
                            isBrokenReported: log.isBrokenReported,
                            brokenDescription: log.brokenDescription,
                            remarks: log.remarks
                        };
                    } catch (error) {
                        console.error('Error processing equipment log:', error);
                        return null;
                    }
                }).filter(Boolean),
                manpowerLogs: manpowerLogs.filter(Boolean),
                materialUsageLogs: materialUsageLogs.filter(Boolean),
                otherCosts: otherCosts.filter(Boolean),
                spkDetail: dailyActivity.spkId,
                userDetail: dailyActivity.createdBy,
                createdAt: dailyActivity.createdAt,
                updatedAt: dailyActivity.updatedAt,
                dailyProgress: dailyProgress
            };
        } catch (error) {
            console.error('Error in getDailyActivityWithDetailsByActivityId:', error);
            throw new Error('Terjadi kesalahan saat mengambil detail laporan harian');
        }
    }
};

const Mutation = {
    createDailyActivity: async (_, args, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const dailyActivity = new DailyActivity(args);
        return dailyActivity.save();
    },

    updateDailyActivity: async (_, { id, ...args }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return DailyActivity.findByIdAndUpdate(id, args, { new: true });
    },

    updateDailyActivityAfterSubmit: async (_, { id, input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            const dailyActivity = await DailyActivity.findById(id);
            if (!dailyActivity) {
                throw new Error('DailyActivity tidak ditemukan');
            }

            // Verifikasi bahwa user yang update adalah creator atau memiliki permission
            if (dailyActivity.createdBy.toString() !== user.userId) {
                // Periksa apakah user memiliki permission khusus untuk edit (admin/superadmin)
                const currentUser = await User.findById(user.userId).populate('role');
                if (!currentUser || !['ADMIN', 'SUPERADMIN'].includes(currentUser.role?.roleCode)) {
                    throw new Error('Tidak memiliki izin untuk mengubah laporan');
                }
            }

            // Status sebelum update dan apakah sebelumnya sudah approved
            const prevStatus = dailyActivity.status;
            const wasApproved = dailyActivity.isApproved;

            // Update fields dari input
            Object.keys(input).forEach(key => {
                if (key !== 'id' && dailyActivity[key] !== undefined) {
                    dailyActivity[key] = input[key];
                }
            });

            // Jika dokumen sudah diapprove sebelumnya, tandai perlu direview dengan status Submitted
            if (wasApproved) {
                dailyActivity.status = 'Submitted';
                dailyActivity.isApproved = false;      // Reset status approval
                dailyActivity.approvedBy = null;       // Reset approver
                dailyActivity.approvedAt = null;       // Reset approve timestamp
                
                // Tambahkan ke approval history
                if (!dailyActivity.approvalHistory) {
                    dailyActivity.approvalHistory = [];
                }
                
                dailyActivity.approvalHistory.push({
                    status: 'Submitted',
                    remarks: 'Dokumen telah diubah setelah disetujui dan memerlukan review kembali',
                    updatedBy: user.userId,
                    updatedAt: new Date()
                });
            }

            dailyActivity.lastUpdatedBy = user.userId;
            dailyActivity.lastUpdatedAt = new Date();

            await dailyActivity.save();

            // Populate required relations
            const populatedActivity = await DailyActivity.findById(dailyActivity._id)
                .populate('spkId')
                .populate('createdBy')
                .populate('approvedBy')
                .populate('lastUpdatedBy')
                .populate('areaId')
                .populate({
                    path: 'approvalHistory.updatedBy',
                    model: 'User'
                });

            return populatedActivity;
        } catch (error) {
            console.error('Error in updateDailyActivityAfterSubmit:', error);
            throw new Error(error.message || 'Terjadi kesalahan saat mengupdate laporan');
        }
    },

    deleteDailyActivity: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await DailyActivity.findByIdAndDelete(id);
        return true;
    },

    deleteDailyActivityById: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            // Check if user is admin or superadmin
            const currentUser = await User.findById(user.userId).populate('role');
            const isAdmin = currentUser?.role?.roleCode === 'ADMIN' || currentUser?.role?.roleCode === 'SUPERADMIN';

            if (!isAdmin) {
                throw new Error('Anda tidak memiliki wewenang untuk menghapus laporan harian');
            }

            // Check if daily activity exists
            const dailyActivity = await DailyActivity.findById(id);
            if (!dailyActivity) {
                throw new Error('Laporan harian tidak ditemukan');
            }

            // Delete all related data
            await Promise.all([
                // Delete activity details
                ActivityDetail.deleteMany({ dailyActivityId: id }),
                // Delete equipment logs
                EquipmentLog.deleteMany({ dailyActivityId: id }),
                // Delete manpower logs
                ManpowerLog.deleteMany({ dailyActivityId: id }),
                // Delete material usage logs
                MaterialUsageLog.deleteMany({ dailyActivityId: id }),
                // Delete other costs
                OtherCost.deleteMany({ dailyActivityId: id })
            ]);

            // Delete daily activity
            await DailyActivity.findByIdAndDelete(id);

            return {
                success: true,
                message: 'Laporan harian berhasil dihapus'
            };
        } catch (error) {
            console.error('Error in deleteDailyActivityById:', error);
            throw new Error(error.message || 'Terjadi kesalahan saat menghapus laporan harian');
        }
    },

    submitDailyReport: async (_, { input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            // Validasi input.activityDetails untuk mencegah workItemId kosong
            if (input.activityDetails && input.activityDetails.some(detail => !detail.workItemId || detail.workItemId === '')) {
                throw new Error('All activity details must have a valid workItemId');
            }
            
            const spk = await SPK.findById(input.spkId);
            if (!spk) {
                throw new Error(`SPK with ID ${input.spkId} not found`);
            }

            const area = await Area.findById(input.areaId);
            if (!area) {
                throw new Error(`Area with ID ${input.areaId} not found`);
            }

            const dailyActivity = new DailyActivity({
                spkId: input.spkId,
                date: input.date,
                areaId: input.areaId,
                weather: input.weather,
                status: 'Submitted',
                workStartTime: input.workStartTime,
                workEndTime: input.workEndTime,
                startImages: input.startImages || [],
                finishImages: input.finishImages || [],
                createdBy: user.userId,
                closingRemarks: input.closingRemarks,
                isActive: true
            });

            await dailyActivity.save();

            const activityDetails = await Promise.all(
                input.activityDetails.map(async (detail) => {
                    const workItem = spk.workItems.find(item =>
                        item.workItemId.toString() === detail.workItemId.toString()
                    );

                    let itemProgressPercentage = 0;
                    let boqVolume = { nr: 0, r: 0 };
                    let rates = {
                        nr: { rate: 0, description: 'Non-remote rate' },
                        r: { rate: 0, description: 'Remote rate' }
                    };
                    
                    if (workItem) {
                        // Simpan BOQ volume dari SPK
                        boqVolume = {
                            nr: workItem.boqVolume?.nr || 0,
                            r: workItem.boqVolume?.r || 0
                        };
                        
                        // Simpan rates dari SPK
                        rates = {
                            nr: {
                                rate: workItem.rates?.nr?.rate || 0,
                                description: workItem.rates?.nr?.description || 'Non-remote rate'
                            },
                            r: {
                                rate: workItem.rates?.r?.rate || 0,
                                description: workItem.rates?.r?.description || 'Remote rate'
                            }
                        };
                        
                        const totalBoqVolume = boqVolume.nr + boqVolume.r;
                        const actualVolume = detail.actualQuantity.nr + detail.actualQuantity.r;
                        itemProgressPercentage = (totalBoqVolume > 0) ? (actualVolume / totalBoqVolume) * 100 : 0;
                    }

                    const activityDetail = new ActivityDetail({
                        dailyActivityId: dailyActivity._id,
                        workItemId: detail.workItemId,
                        // Simpan BOQ dan rates dari SPK untuk mencegah ketidakkonsistenan data
                        boqVolume,
                        rates,
                        actualQuantity: {
                            nr: detail.actualQuantity.nr || 0,
                            r: detail.actualQuantity.r || 0
                        },
                        status: detail.status,
                        remarks: detail.remarks,
                        progressPercentage: itemProgressPercentage,
                        createdBy: user.userId,
                        isActive: true
                    });
                    return activityDetail.save();
                })
            );

            const equipmentLogs = await Promise.all(
                input.equipmentLogs.map(async (log) => {
                    const equipment = await Equipment.findById(log.equipmentId);
                    if (!equipment) {
                        throw new Error(`Equipment with ID ${log.equipmentId} not found`);
                    }

                    const latestFuelPrice = await FuelPrice.findOne()
                        .sort({ effectiveDate: -1 });

                    const equipmentLog = new EquipmentLog({
                        dailyActivityId: dailyActivity._id,
                        equipmentId: log.equipmentId,
                        fuelIn: log.fuelIn,
                        fuelRemaining: log.fuelRemaining,
                        workingHour: log.workingHour,
                        hourlyRate: 0,  // Set hourlyRate to 0
                        rentalRatePerDay: log.hourlyRate || 0,  // Copy hourlyRate input to rentalRatePerDay
                        fuelPrice: latestFuelPrice ? latestFuelPrice.pricePerLiter : 0,
                        isBrokenReported: log.isBrokenReported || false,
                        brokenDescription: log.brokenDescription,
                        remarks: log.remarks,
                        createdBy: user.userId,
                        lastUpdatedBy: user.userId
                    });

                    return equipmentLog.save();
                })
            );

            const manpowerLogs = await Promise.all(
                input.manpowerLogs.map(async (log) => {
                    const role = await PersonnelRole.findById(log.role);
                    if (!role) {
                        throw new Error(`PersonnelRole with ID ${log.role} not found`);
                    }

                    const manpowerLog = new ManpowerLog({
                        dailyActivityId: dailyActivity._id,
                        role: log.role,
                        personCount: log.personCount,
                        hourlyRate: log.hourlyRate,
                        createdBy: user.userId
                    });
                    return manpowerLog.save();
                })
            );

            const materialUsageLogs = await Promise.all(
                input.materialUsageLogs.map(async (log) => {
                    const materialUsageLog = new MaterialUsageLog({
                        dailyActivityId: dailyActivity._id,
                        materialId: log.materialId,
                        quantity: log.quantity,
                        unitRate: log.unitRate,
                        remarks: log.remarks,
                        createdBy: user.userId
                    });
                    return materialUsageLog.save();
                })
            );

            const otherCosts = await Promise.all(
                (input.otherCosts || []).map(async (cost) => {
                    const otherCost = new OtherCost({
                        dailyActivityId: dailyActivity._id,
                        costType: cost.costType,
                        amount: cost.amount,
                        description: cost.description,
                        receiptNumber: cost.receiptNumber,
                        remarks: cost.remarks,
                        createdBy: user.userId,
                        lastUpdatedBy: user.userId
                    });
                    return otherCost.save();
                })
            );

            const progress = {
                physical: calculateDailyPhysicalProgress(activityDetails, spk),
                financial: calculateDailyFinancialProgress(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts)
            };

            const costs = calculateDailyCosts(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts);

            // Calculate progress percentage: (progress_volume_hari_ini / target_harian) * 100
            let overallProgressPercentage = 0;
            if (spk && spk.workItems && spk.startDate && spk.endDate) {
                // Calculate total working days
                const startDate = new Date(spk.startDate);
                const endDate = new Date(spk.endDate);
                const totalWorkDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

                // Calculate total BOQ volume from SPK
                const totalBOQVolume = spk.workItems.reduce((total, item) => {
                    const nr = item.boqVolume?.nr || 0;
                    const r = item.boqVolume?.r || 0;
                    return total + nr + r;
                }, 0);

                // Calculate daily target
                const targetHarian = totalBOQVolume / totalWorkDays;

                // Calculate actual volume for this day
                const progressVolumeHariIni = activityDetails.reduce((total, detail) => {
                    const nr = detail.actualQuantity?.nr || 0;
                    const r = detail.actualQuantity?.r || 0;
                    return total + nr + r;
                }, 0);

                // Calculate percentage: (progress_volume_hari_ini / target_harian) * 100
                overallProgressPercentage = targetHarian > 0 ? (progressVolumeHariIni / targetHarian) * 100 : 0;
                overallProgressPercentage = Math.round(overallProgressPercentage * 100) / 100; // Round to 2 decimal places
            }

            const overallBudgetUsage = calculateBudgetUsagePercentage(activityDetails, spk);

            return {
                id: dailyActivity._id,
                date: dailyActivity.date,
                area: area,
                weather: dailyActivity.weather,
                status: dailyActivity.status,
                workStartTime: dailyActivity.workStartTime,
                workEndTime: dailyActivity.workEndTime,
                startImages: dailyActivity.startImages || [],
                finishImages: dailyActivity.finishImages || [],
                progress,
                costs,
                progressPercentage: overallProgressPercentage,
                budgetUsage: overallBudgetUsage,
                activityDetails: activityDetails.map(detail => ({
                    id: detail._id,
                    dailyActivityId: detail.dailyActivityId,
                    workItemId: detail.workItemId,
                    actualQuantity: detail.actualQuantity,
                    status: detail.status,
                    remarks: detail.remarks,
                    progressPercentage: detail.progressPercentage
                })),
                equipmentLogs: equipmentLogs.map(log => ({
                    id: log._id,
                    dailyActivityId: log.dailyActivityId,
                    equipmentId: log.equipmentId,
                    fuelIn: log.fuelIn,
                    fuelRemaining: log.fuelRemaining,
                    workingHour: log.workingHour,
                    hourlyRate: log.hourlyRate,
                    rentalRatePerDay: log.rentalRatePerDay,
                    isBrokenReported: log.isBrokenReported,
                    remarks: log.remarks
                })),
                manpowerLogs: manpowerLogs.map(log => ({
                    id: log._id,
                    dailyActivityId: log.dailyActivityId,
                    role: log.role,
                    personCount: log.personCount,
                    hourlyRate: log.hourlyRate
                })),
                materialUsageLogs: materialUsageLogs.map(log => ({
                    id: log._id,
                    dailyActivityId: log.dailyActivityId,
                    materialId: log.materialId,
                    quantity: log.quantity,
                    unitRate: log.unitRate,
                    remarks: log.remarks
                })),
                otherCosts: otherCosts.map(cost => ({
                    id: cost._id,
                    dailyActivityId: cost.dailyActivityId,
                    costType: cost.costType,
                    amount: cost.amount,
                    receiptNumber: cost.receiptNumber,
                    remarks: cost.remarks
                }))
            };
        } catch (error) {
            console.error('Error in submitDailyReport:', error);
            console.error('Error stack:', error.stack);
            
            // Log detail untuk validasi workItemId
            if (input.activityDetails) {
                console.log('ActivityDetails input:', JSON.stringify(input.activityDetails.map(d => ({
                    workItemId: d.workItemId,
                    type: typeof d.workItemId,
                    isEmpty: !d.workItemId || d.workItemId === ''
                }))));
            }
            
            if (error.name === 'ValidationError' && error.errors && error.errors.workItemId) {
                console.error('workItemId validation error:', error.errors.workItemId);
                throw new Error(`Validation error: ${error.errors.workItemId.message}`);
            }
            
            throw error;
        }
    },

    // Updated approval system based on area instead of approver settings
    approveDailyReport: async (_, { id, status, remarks }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            // Validate status
            if (!['Approved', 'Rejected'].includes(status)) {
                throw new Error('Status harus berupa "Approved" atau "Rejected"');
            }

            const dailyActivity = await DailyActivity.findById(id).populate('areaId');
            if (!dailyActivity) {
                throw new Error('DailyActivity tidak ditemukan');
            }

            // Check if user is admin or superadmin
            const currentUser = await User.findById(user.userId).populate(['role', 'area']);
            if (!currentUser) {
                throw new Error('User tidak ditemukan');
            }

            const isAdmin = currentUser.role && (currentUser.role.roleCode === 'ADMIN' || currentUser.role.roleCode === 'SUPERADMIN');

            // If not admin/superadmin, check if user is in the same area as the daily activity
            if (!isAdmin) {
                // Check if user has the same area as the daily activity
                if (!currentUser.area || !dailyActivity.areaId) {
                    throw new Error('User tidak memiliki area yang ditentukan atau laporan tidak memiliki area');
                }

                if (currentUser.area._id.toString() !== dailyActivity.areaId._id.toString()) {
                    throw new Error('User hanya dapat menyetujui laporan dari area yang sama');
                }

                // Additional check: user should have supervisor or mandor role to approve in the same area
                const canApprove = currentUser.role && (
                    currentUser.role.roleCode === 'SUPERVISOR' ||
                    currentUser.role.roleCode === 'MANDOR'
                );

                if (!canApprove) {
                    throw new Error('User tidak memiliki wewenang untuk menyetujui laporan');
                }
            }

            // Update status and history
            dailyActivity.status = status;
            dailyActivity.isApproved = status === 'Approved';
            dailyActivity.approvedBy = status === 'Approved' ? user.userId : null;
            dailyActivity.approvedAt = status === 'Approved' ? new Date() : null;
            dailyActivity.rejectionReason = status === 'Rejected' ? remarks : null;
            dailyActivity.lastUpdatedBy = user.userId;
            dailyActivity.lastUpdatedAt = new Date();

            // Add to approval history
            if (!dailyActivity.approvalHistory) {
                dailyActivity.approvalHistory = [];
            }

            dailyActivity.approvalHistory.push({
                status,
                remarks: remarks || '',
                updatedBy: user.userId,
                updatedAt: new Date()
            });

            await dailyActivity.save();

            // Populate required relations
            const populatedActivity = await DailyActivity.findById(dailyActivity._id)
                .populate('spkId')
                .populate('createdBy')
                .populate('approvedBy')
                .populate('lastUpdatedBy')
                .populate('areaId')
                .populate({
                    path: 'approvalHistory.updatedBy',
                    model: 'User'
                });

            return populatedActivity;
        } catch (error) {
            console.error('Error in approveDailyReport:', error);
            throw new Error(error.message || 'Terjadi kesalahan saat menyetujui laporan');
        }
    }
};

const DailyActivityResolvers = {
    spk: async (parent) => {
        return SPK.findById(parent.spkId);
    },
    user: async (parent) => {
        return User.findById(parent.createdBy);
    },
    approvedBy: async (parent) => {
        return User.findById(parent.approvedBy);
    },
    lastUpdatedBy: async (parent) => {
        return User.findById(parent.lastUpdatedBy);
    },
    approvalHistory: async (parent) => {
        if (!parent.approvalHistory) return [];
        return Promise.all(parent.approvalHistory.map(async (history) => ({
            ...history.toObject(),
            updatedBy: await User.findById(history.updatedBy)
        })));
    }
};

const ActivityDetailResolvers = {
    dailyActivity: async (parent) => {
        return DailyActivity.findById(parent.dailyActivityId);
    },
    workItem: async (parent) => {
        return WorkItem.findById(parent.workItemId);
    },
    // Explicitly return the stored rates from ActivityDetail
    rates: (parent) => {
        // If parent has rates stored, return those first
        if (parent.rates && (parent.rates.nr || parent.rates.r)) {
            return parent.rates;
        }
        
        // Fallback to default empty rates if not available
        return {
            nr: { rate: 0, description: 'Default non-remote rate' },
            r: { rate: 0, description: 'Default remote rate' }
        };
    },
    // Explicitly return the stored boqVolume from ActivityDetail
    boqVolume: (parent) => {
        if (parent.boqVolume && (parent.boqVolume.nr !== undefined || parent.boqVolume.r !== undefined)) {
            return parent.boqVolume;
        }
        
        // Fallback to default empty boqVolume if not available
        return { nr: 0, r: 0 };
    }
};

const EquipmentLogResolvers = {
    dailyActivity: async (parent) => {
        return DailyActivity.findById(parent.dailyActivityId);
    },
    equipment: async (parent) => {
        return Equipment.findById(parent.equipmentId);
    }
};

const ManpowerLogResolvers = {
    id: (parent) => parent._id || parent.id,
    role: (parent) => {
        if (parent.role && parent.role._id) {
            return parent.role._id.toString();
        }
        if (typeof parent.role === 'string') {
            return parent.role;
        }
        if (parent.role) {
            return parent.role.toString();
        }
        return "default";
    },
    hourlyRate: (parent) => parent.hourlyRate || 0,
    workingHours: (parent) => parent.workingHours || 0,
    dailyActivity: async (parent) => {
        if (!parent.dailyActivityId) return null;
        return DailyActivity.findById(parent.dailyActivityId);
    },
    personnelRole: async (parent) => {
        let roleId = parent.role;

        if (parent.role && parent.role._id) {
            roleId = parent.role._id;
        }

        if (roleId) {
            const role = await PersonnelRole.findById(roleId);
            if (role) {
                return {
                    id: role._id,
                    roleCode: role.roleCode,
                    roleName: role.roleName,
                    description: role.description
                };
            }
        }

        return {
            id: "default",
            roleCode: "USER",
            roleName: "Regular User",
            description: "Default role"
        };
    }
};

const MaterialUsageLogResolvers = {
    dailyActivity: async (parent) => {
        return DailyActivity.findById(parent.dailyActivityId);
    },
    material: async (parent) => {
        return Material.findById(parent.materialId);
    }
};

const OtherCostResolvers = {
    dailyActivity: async (parent) => {
        return DailyActivity.findById(parent.dailyActivityId);
    }
};

module.exports = {
    Query,
    Mutation,
    DailyActivity: DailyActivityResolvers,
    ActivityDetail: ActivityDetailResolvers,
    EquipmentLog: EquipmentLogResolvers,
    ManpowerLog: ManpowerLogResolvers,
    MaterialUsageLog: MaterialUsageLogResolvers,
    OtherCost: OtherCostResolvers
}; 