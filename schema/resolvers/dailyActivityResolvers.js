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
    FuelPrice,
    ApproverSetting
} = require('../../models');

const {
    calculateDailyPhysicalProgress,
    calculateDailyFinancialProgress,
    calculateDailyCosts,
    calculateProgressPercentage
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

    dailyActivitiesWithDetailsByUser: async (_, { userId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const dailyActivities = await DailyActivity.find({ createdBy: userId })
            .populate('spkId')
            .populate('createdBy')
            .populate('areaId');

        const result = await Promise.all(
            dailyActivities.map(async (da) => {
                const activityDetails = await ActivityDetail.find({ dailyActivityId: da._id })
                    .populate('workItemId');

                const equipmentLogs = await EquipmentLog.find({ dailyActivityId: da._id })
                    .populate('equipmentId');

                const manpowerLogs = await ManpowerLog.find({
                    dailyActivityId: da._id,
                    isActive: true
                }).populate('role');

                const materialUsageLogs = await MaterialUsageLog.find({ dailyActivityId: da._id })
                    .populate('materialId');

                const otherCosts = await OtherCost.find({ dailyActivityId: da._id });

                let progressPercentage = 0;
                let targetHarian = 0;
                let totalBiayaItemwork = 0;
                let totalHariKerja = 1;
                let totalBudget = 0;
                if (da.spkId) {
                    // Hitung total hari kerja dari startDate dan endDate SPK
                    const start = da.spkId.startDate ? new Date(da.spkId.startDate) : null;
                    const end = da.spkId.endDate ? new Date(da.spkId.endDate) : null;
                    if (start && end) {
                        totalHariKerja = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
                    } else {
                        totalHariKerja = 1;
                    }
                    totalBudget = da.spkId.budget || 0;
                    targetHarian = totalBudget / totalHariKerja;
                }
                if (activityDetails.length > 0) {
                    totalBiayaItemwork = activityDetails.reduce((sum, detail) => {
                        let biaya = 0;
                        if (detail.workItemId && detail.actualQuantity) {
                            const rates = detail.workItemId.rates || { nr: { rate: 0 }, r: { rate: 0 } };
                            const qtyNr = detail.actualQuantity.nr || 0;
                            const qtyR = detail.actualQuantity.r || 0;
                            const rateNr = rates.nr?.rate || 0;
                            const rateR = rates.r?.rate || 0;
                            biaya = (qtyNr * rateNr) + (qtyR * rateR);
                            if (qtyNr > 0 || qtyR > 0) {
                                // Log detail hanya jika actual > 0
                                console.log('[Itemwork]',
                                    'Nama:', detail.workItemId.name,
                                    '| Qty NR:', qtyNr,
                                    '| Rate NR:', rateNr,
                                    '| Qty R:', qtyR,
                                    '| Rate R:', rateR,
                                    '| Biaya:', biaya,
                                    '| Unit:', detail.workItemId.unitId?.name || '-'
                                );
                            }
                        }
                        return sum + biaya;
                    }, 0);
                }
                if (targetHarian > 0) {
                    console.log('targetHarian:', targetHarian);
                    console.log('totalBiayaItemwork:', totalBiayaItemwork);
                    progressPercentage = (totalBiayaItemwork / targetHarian) * 100;
                } else {
                    progressPercentage = 0;
                }

                return {
                    id: da._id,
                    date: da.date,
                    location: da.areaId ? da.areaId.name : null,
                    weather: da.weather,
                    status: da.status,
                    workStartTime: da.workStartTime,
                    workEndTime: da.workEndTime,
                    startImages: da.startImages || [],
                    finishImages: da.finishImages || [],
                    closingRemarks: da.closingRemarks,
                    progressPercentage,
                    activityDetails,
                    equipmentLogs,
                    manpowerLogs,
                    materialUsageLogs,
                    otherCosts,
                    spkDetail: da.spkId,
                    userDetail: da.createdBy,
                    createdAt: da.createdAt,
                    updatedAt: da.updatedAt
                };
            })
        );

        return result;
    },

    dailyActivitiesWithDetailsByUserAndApprover: async (_, { userId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const dailyActivities = await DailyActivity.find({ createdBy: userId })
            .populate('spkId')
            .populate('createdBy');

        const result = await Promise.all(
            dailyActivities.map(async (da) => {
                const activityDetails = await ActivityDetail.find({ dailyActivityId: da._id })
                    .populate('workItemId');

                const equipmentLogs = await EquipmentLog.find({ dailyActivityId: da._id })
                    .populate('equipmentId');

                const manpowerLogs = await ManpowerLog.find({
                    dailyActivityId: da._id,
                    isActive: true
                }).populate('role');

                const materialUsageLogs = await MaterialUsageLog.find({ dailyActivityId: da._id })
                    .populate('materialId');

                const otherCosts = await OtherCost.find({ dailyActivityId: da._id });

                let progressPercentage = 0;
                let targetHarian = 0;
                let totalBiayaItemwork = 0;
                let totalHariKerja = 1;
                let totalBudget = 0;
                if (da.spkId) {
                    // Hitung total hari kerja dari startDate dan endDate SPK
                    const start = da.spkId.startDate ? new Date(da.spkId.startDate) : null;
                    const end = da.spkId.endDate ? new Date(da.spkId.endDate) : null;
                    if (start && end) {
                        totalHariKerja = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
                    } else {
                        totalHariKerja = 1;
                    }
                    totalBudget = da.spkId.budget || 0;
                    targetHarian = totalBudget / totalHariKerja;
                }
                if (activityDetails.length > 0) {
                    totalBiayaItemwork = activityDetails.reduce((sum, detail) => {
                        let biaya = 0;
                        if (detail.workItemId && detail.actualQuantity) {
                            const rates = detail.workItemId.rates || { nr: { rate: 0 }, r: { rate: 0 } };
                            const qtyNr = detail.actualQuantity.nr || 0;
                            const qtyR = detail.actualQuantity.r || 0;
                            const rateNr = rates.nr?.rate || 0;
                            const rateR = rates.r?.rate || 0;
                            biaya = (qtyNr * rateNr) + (qtyR * rateR);
                            if (qtyNr > 0 || qtyR > 0) {
                                // Log detail hanya jika actual > 0
                                console.log('[Itemwork]',
                                    'Nama:', detail.workItemId.name,
                                    '| Qty NR:', qtyNr,
                                    '| Rate NR:', rateNr,
                                    '| Qty R:', qtyR,
                                    '| Rate R:', rateR,
                                    '| Biaya:', biaya,
                                    '| Unit:', detail.workItemId.unitId?.name || '-'
                                );
                            }
                        }
                        return sum + biaya;
                    }, 0);
                }
                if (targetHarian > 0) {
                    console.log('targetHarian:', targetHarian);
                    console.log('totalBiayaItemwork:', totalBiayaItemwork);
                    progressPercentage = (totalBiayaItemwork / targetHarian) * 100;
                } else {
                    progressPercentage = 0;
                }

                return {
                    id: da._id,
                    date: da.date,
                    location: da.location,
                    weather: da.weather,
                    status: da.status,
                    workStartTime: da.workStartTime,
                    workEndTime: da.workEndTime,
                    startImages: da.startImages || [],
                    finishImages: da.finishImages || [],
                    closingRemarks: da.closingRemarks,
                    progressPercentage,
                    activityDetails,
                    equipmentLogs,
                    manpowerLogs,
                    materialUsageLogs,
                    otherCosts,
                    spkDetail: da.spkId,
                    userDetail: da.createdBy,
                    createdAt: da.createdAt,
                    updatedAt: da.updatedAt
                };
            })
        );

        return result;
    },

    dailyActivitiesWithDetailsByUserAndApprover: async (_, { userId, approverId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        // Validasi bahwa user yang melakukan query adalah approver yang ditunjuk
        const approverSetting = await ApproverSetting.findOne({
            userId,
            approverId,
            isActive: true
        });

        if (!approverSetting) {
            throw new Error('User tidak memiliki wewenang untuk melihat laporan ini');
        }

        // Ambil semua daily activity dengan detail lengkap
        const dailyActivities = await DailyActivity.find({ createdBy: userId })
            .populate('spkId')
            .populate('contractId')
            .populate('createdBy')
            .populate('areaId')
            .sort({ date: -1 });

        // Populate semua relasi yang diperlukan
        const populatedActivities = await Promise.all(dailyActivities.map(async (activity) => {
            const activityDetails = await ActivityDetail.find({ dailyActivityId: activity._id })
                .populate({
                    path: 'workItemId',
                    populate: {
                        path: 'unitId',
                        select: 'name code'
                    }
                });

            const equipmentLogs = await EquipmentLog.find({ dailyActivityId: activity._id })
                .populate('equipmentId');

            const manpowerLogs = await ManpowerLog.find({ dailyActivityId: activity._id })
                .populate('role');

            const materialUsageLogs = await MaterialUsageLog.find({ dailyActivityId: activity._id })
                .populate('materialId');

            const otherCosts = await OtherCost.find({ dailyActivityId: activity._id });

            // Hitung progress percentage
            const progressPercentage = await calculateProgressPercentage(activity._id);

            return {
                ...activity.toObject(),
                activityDetails: activityDetails.map(detail => {
                    if (!detail || !detail.workItemId) {
                        console.log('Detail atau workItemId null:', detail);
                        return null;
                    }
                    try {
                        return {
                            ...detail.toObject(),
                            workItem: detail.workItemId ? {
                                ...detail.workItemId.toObject(),
                                unit: detail.workItemId.unitId,
                                rates: detail.workItemId.rates
                            } : null
                        };
                    } catch (error) {
                        console.error('Error processing activity detail:', error);
                        return null;
                    }
                }).filter(Boolean), // Filter out null values
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
                            fuelPrice: latestFuelPrice ? latestFuelPrice.pricePerLiter : 0,
                            isBrokenReported: log.isBrokenReported,
                            brokenDescription: log.brokenDescription,
                            remarks: log.remarks
                        };
                    } catch (error) {
                        console.error('Error processing equipment log:', error);
                        return null;
                    }
                }).filter(Boolean), // Filter out null values
                manpowerLogs: manpowerLogs.filter(Boolean),
                materialUsageLogs: materialUsageLogs.filter(Boolean),
                otherCosts: otherCosts.filter(Boolean),
                progressPercentage,
                spkDetail: activity.spkId,
                userDetail: activity.createdBy
            };
        }));

        return populatedActivities;
    },

    dailyActivitiesWithDetailsByApprover: async (_, { approverId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            // Validasi format ObjectId
            if (!approverId.match(/^[0-9a-fA-F]{24}$/)) {
                throw new Error('ID Approver tidak valid');
            }

            // Cek apakah user adalah admin atau superadmin
            const currentUser = await User.findById(user.userId).populate('role');
            console.log('Current user role:', currentUser?.role?.roleCode);

            const isAdmin = currentUser?.role?.roleCode === 'ADMIN' || currentUser?.role?.roleCode === 'SUPERADMIN';
            console.log('Is admin/superadmin:', isAdmin);

            if (isAdmin) {
                console.log('User adalah admin/superadmin, mengambil semua data tanpa filter');
                // Ambil semua daily activity tanpa filter
                const dailyActivities = await DailyActivity.find()
                    .populate('spkId')
                    .populate('createdBy')
                    .sort({ date: -1 });

                console.log('Jumlah daily activities ditemukan:', dailyActivities.length);

                if (dailyActivities.length === 0) {
                    console.log('Tidak ada daily activities yang ditemukan');
                    return [];
                }

                // Ambil harga bahan bakar terbaru
                const latestFuelPrice = await FuelPrice.findOne()
                    .sort({ effectiveDate: -1 });

                // Populate semua relasi yang diperlukan
                const populatedActivities = await Promise.all(dailyActivities.map(async (activity) => {
                    const activityDetails = await ActivityDetail.find({ dailyActivityId: activity._id })
                        .populate({
                            path: 'workItemId',
                            populate: {
                                path: 'unitId',
                                select: 'name code'
                            }
                        });

                    const equipmentLogs = await EquipmentLog.find({ dailyActivityId: activity._id })
                        .populate('equipmentId')
                        .select('equipmentId fuelIn fuelRemaining workingHour hourlyRate isBrokenReported brokenDescription remarks');

                    const manpowerLogs = await ManpowerLog.find({ dailyActivityId: activity._id })
                        .populate('role');

                    const materialUsageLogs = await MaterialUsageLog.find({ dailyActivityId: activity._id })
                        .populate('materialId');

                    const otherCosts = await OtherCost.find({ dailyActivityId: activity._id });

                    // Hitung progress percentage
                    const progressPercentage = await calculateProgressPercentage(activity._id);

                    return {
                        id: activity._id,
                        date: activity.date,
                        location: activity.location,
                        weather: activity.weather,
                        status: activity.status,
                        workStartTime: activity.workStartTime,
                        workEndTime: activity.workEndTime,
                        startImages: activity.startImages || [],
                        finishImages: activity.finishImages || [],
                        closingRemarks: activity.closingRemarks,
                        progressPercentage,
                        activityDetails: activityDetails.map(detail => {
                            if (!detail || !detail.workItemId) {
                                console.log('Detail atau workItemId null:', detail);
                                return null;
                            }
                            try {
                                return {
                                    ...detail.toObject(),
                                    workItem: detail.workItemId ? {
                                        ...detail.workItemId.toObject(),
                                        unit: detail.workItemId.unitId,
                                        rates: detail.workItemId.rates
                                    } : null
                                };
                            } catch (error) {
                                console.error('Error processing activity detail:', error);
                                return null;
                            }
                        }).filter(Boolean), // Filter out null values
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
                                    fuelPrice: latestFuelPrice ? latestFuelPrice.pricePerLiter : 0,
                                    isBrokenReported: log.isBrokenReported,
                                    brokenDescription: log.brokenDescription,
                                    remarks: log.remarks
                                };
                            } catch (error) {
                                console.error('Error processing equipment log:', error);
                                return null;
                            }
                        }).filter(Boolean), // Filter out null values
                        manpowerLogs: manpowerLogs.filter(Boolean),
                        materialUsageLogs: materialUsageLogs.filter(Boolean),
                        otherCosts: otherCosts.filter(Boolean),
                        spkDetail: activity.spkId,
                        userDetail: activity.createdBy,
                        createdAt: activity.createdAt,
                        updatedAt: activity.updatedAt
                    };
                }));

                console.log('Jumlah populated activities:', populatedActivities.length);
                return populatedActivities;
            }

            // Jika bukan admin/superadmin, cari berdasarkan approver settings
            console.log('User bukan admin/superadmin, mencari berdasarkan approver settings');
            const approverSettings = await ApproverSetting.find({
                approverId,
                isActive: true
            });

            console.log('Jumlah approver settings ditemukan:', approverSettings.length);

            if (!approverSettings || approverSettings.length === 0) {
                console.log('Tidak ada approver settings yang ditemukan');
                return [];
            }

            // Ambil ID dari semua user yang memiliki approver tersebut
            const userIds = approverSettings.map(setting => setting.userId);
            console.log('User IDs yang ditemukan:', userIds);

            // Ambil semua daily activity dari user-user tersebut
            const dailyActivities = await DailyActivity.find({ createdBy: { $in: userIds } })
                .populate('spkId')
                .populate('createdBy')
                .sort({ date: -1 });

            console.log('Jumlah daily activities ditemukan:', dailyActivities.length);

            if (dailyActivities.length === 0) {
                console.log('Tidak ada daily activities yang ditemukan');
                return [];
            }

            // Ambil harga bahan bakar terbaru
            const latestFuelPrice = await FuelPrice.findOne()
                .sort({ effectiveDate: -1 });

            // Populate semua relasi yang diperlukan
            const populatedActivities = await Promise.all(dailyActivities.map(async (activity) => {
                const activityDetails = await ActivityDetail.find({ dailyActivityId: activity._id })
                    .populate({
                        path: 'workItemId',
                        populate: {
                            path: 'unitId',
                            select: 'name code'
                        }
                    });

                const equipmentLogs = await EquipmentLog.find({ dailyActivityId: activity._id })
                    .populate('equipmentId')
                    .select('equipmentId fuelIn fuelRemaining workingHour hourlyRate isBrokenReported brokenDescription remarks');

                const manpowerLogs = await ManpowerLog.find({ dailyActivityId: activity._id })
                    .populate('role');

                const materialUsageLogs = await MaterialUsageLog.find({ dailyActivityId: activity._id })
                    .populate('materialId');

                const otherCosts = await OtherCost.find({ dailyActivityId: activity._id });

                // Hitung progress percentage
                const progressPercentage = await calculateProgressPercentage(activity._id);

                return {
                    id: activity._id,
                    date: activity.date,
                    location: activity.location,
                    weather: activity.weather,
                    status: activity.status,
                    workStartTime: activity.workStartTime,
                    workEndTime: activity.workEndTime,
                    startImages: activity.startImages || [],
                    finishImages: activity.finishImages || [],
                    closingRemarks: activity.closingRemarks,
                    progressPercentage,
                    activityDetails: activityDetails.map(detail => {
                        if (!detail || !detail.workItemId) {
                            console.log('Detail atau workItemId null:', detail);
                            return null;
                        }
                        try {
                            return {
                                ...detail.toObject(),
                                workItem: detail.workItemId ? {
                                    ...detail.workItemId.toObject(),
                                    unit: detail.workItemId.unitId,
                                    rates: detail.workItemId.rates
                                } : null
                            };
                        } catch (error) {
                            console.error('Error processing activity detail:', error);
                            return null;
                        }
                    }).filter(Boolean), // Filter out null values
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
                                fuelPrice: latestFuelPrice ? latestFuelPrice.pricePerLiter : 0,
                                isBrokenReported: log.isBrokenReported,
                                brokenDescription: log.brokenDescription,
                                remarks: log.remarks
                            };
                        } catch (error) {
                            console.error('Error processing equipment log:', error);
                            return null;
                        }
                    }).filter(Boolean), // Filter out null values
                    manpowerLogs: manpowerLogs.filter(Boolean),
                    materialUsageLogs: materialUsageLogs.filter(Boolean),
                    otherCosts: otherCosts.filter(Boolean),
                    spkDetail: activity.spkId,
                    userDetail: activity.createdBy,
                    createdAt: activity.createdAt,
                    updatedAt: activity.updatedAt
                };
            }));

            console.log('Jumlah populated activities:', populatedActivities.length);
            return populatedActivities;
        } catch (error) {
            console.error('Error in dailyActivitiesWithDetailsByApprover:', error);
            throw error;
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

    deleteDailyActivity: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await DailyActivity.findByIdAndDelete(id);
        return true;
    },

    deleteDailyActivityById: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            // Cek apakah user adalah admin atau superadmin
            const currentUser = await User.findById(user.userId).populate('role');
            const isAdmin = currentUser?.role?.roleCode === 'ADMIN' || currentUser?.role?.roleCode === 'SUPERADMIN';

            if (!isAdmin) {
                throw new Error('Anda tidak memiliki wewenang untuk menghapus laporan harian');
            }

            // Cek apakah daily activity ada
            const dailyActivity = await DailyActivity.findById(id);
            if (!dailyActivity) {
                throw new Error('Laporan harian tidak ditemukan');
            }

            // Hapus semua data terkait
            await Promise.all([
                // Hapus activity details
                ActivityDetail.deleteMany({ dailyActivityId: id }),
                // Hapus equipment logs
                EquipmentLog.deleteMany({ dailyActivityId: id }),
                // Hapus manpower logs
                ManpowerLog.deleteMany({ dailyActivityId: id }),
                // Hapus material usage logs
                MaterialUsageLog.deleteMany({ dailyActivityId: id }),
                // Hapus other costs
                OtherCost.deleteMany({ dailyActivityId: id })
            ]);

            // Hapus daily activity
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
                    if (workItem) {
                        const totalBoqVolume = workItem.boqVolume.nr + workItem.boqVolume.r;
                        const actualVolume = detail.actualQuantity.nr + detail.actualQuantity.r;
                        itemProgressPercentage = (totalBoqVolume > 0) ? (actualVolume / totalBoqVolume) * 100 : 0;
                    }

                    const activityDetail = new ActivityDetail({
                        dailyActivityId: dailyActivity._id,
                        workItemId: detail.workItemId,
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
                        hourlyRate: log.hourlyRate || 0,
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
            const overallProgressPercentage = calculateProgressPercentage(activityDetails, spk);

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
                    description: cost.description,
                    receiptNumber: cost.receiptNumber,
                    remarks: cost.remarks
                }))
            };
        } catch (error) {
            throw error;
        }
    },

    updateApproval: async (_, { id, status, remarks }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const dailyActivity = await DailyActivity.findById(id);
        if (!dailyActivity) throw new Error('DailyActivity not found');

        // Cek apakah user adalah approver yang ditunjuk
        const approverSetting = await ApproverSetting.findOne({
            userId: dailyActivity.createdBy,
            approverId: user.userId,
            isActive: true
        });

        if (status === 'Approved' && !approverSetting) {
            throw new Error('User tidak memiliki wewenang untuk menyetujui laporan ini');
        }

        // Update status dan riwayat
        dailyActivity.status = status;
        dailyActivity.isApproved = status === 'Approved';
        dailyActivity.approvedBy = status === 'Approved' ? user.userId : null;
        dailyActivity.approvedAt = status === 'Approved' ? new Date() : null;
        dailyActivity.rejectionReason = status === 'Rejected' ? remarks : null;

        // Tambahkan ke riwayat persetujuan
        dailyActivity.approvalHistory.push({
            status,
            remarks,
            updatedBy: user.userId,
            updatedAt: new Date()
        });

        // Update last updated
        dailyActivity.lastUpdatedBy = user.userId;
        dailyActivity.lastUpdatedAt = new Date();

        await dailyActivity.save();
        return dailyActivity;
    },

    approveDailyReport: async (_, { id, status, remarks }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            // Validasi status
            if (!['Approved', 'Rejected'].includes(status)) {
                throw new Error('Status harus berupa "Approved" atau "Rejected"');
            }

            const dailyActivity = await DailyActivity.findById(id);
            if (!dailyActivity) {
                throw new Error('DailyActivity tidak ditemukan');
            }

            // Cek apakah user adalah admin atau superadmin
            const currentUser = await User.findById(user.userId).populate('role');
            if (!currentUser) {
                throw new Error('User tidak ditemukan');
            }

            const isAdmin = currentUser.role && (currentUser.role.roleCode === 'ADMIN' || currentUser.role.roleCode === 'SUPERADMIN');

            // Jika bukan admin/superadmin, cek apakah user adalah approver yang ditunjuk
            if (!isAdmin) {
                const approverSetting = await ApproverSetting.findOne({
                    userId: dailyActivity.createdBy,
                    approverId: user.userId,
                    isActive: true
                });

                if (!approverSetting) {
                    throw new Error('User tidak memiliki wewenang untuk menyetujui laporan ini');
                }
            }

            // Update status dan riwayat
            dailyActivity.status = status;
            dailyActivity.isApproved = status === 'Approved';
            dailyActivity.approvedBy = status === 'Approved' ? user.userId : null;
            dailyActivity.approvedAt = status === 'Approved' ? new Date() : null;
            dailyActivity.rejectionReason = status === 'Rejected' ? remarks : null;
            dailyActivity.lastUpdatedBy = user.userId;
            dailyActivity.lastUpdatedAt = new Date();

            // Tambahkan ke riwayat persetujuan
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

            // Populate relasi yang diperlukan
            const populatedActivity = await DailyActivity.findById(dailyActivity._id)
                .populate('spkId')
                .populate('createdBy')
                .populate('approvedBy')
                .populate('lastUpdatedBy')
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