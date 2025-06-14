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



    // Consolidated function to get daily activities with details
    getDailyActivityWithDetails: async (_, { areaId, userId, activityId, startDate, endDate }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        try {
            // Build query filter
            const query = {};

            // Filter by activity ID if provided
            if (activityId) {
                query._id = activityId;
            }

            // Filter by area if provided
            if (areaId) {
                query.areaId = areaId;
            }

            // Filter by user if provided
            if (userId) {
                query.createdBy = userId;
            }

            // Filter by date range if provided
            if (startDate || endDate) {
                query.date = {};
                if (startDate) query.date.$gte = new Date(startDate);
                if (endDate) query.date.$lte = new Date(endDate);
            }

            console.log('Query filter:', query);

            // Get daily activities with populated data
            const dailyActivities = await DailyActivity.find(query)
                .populate('spkId')
                .populate('createdBy')
                .populate('areaId')
                .populate('approvedBy')
                .sort({ date: -1 });

            console.log('Daily activities found:', dailyActivities.length);

            if (dailyActivities.length === 0) {
                console.log('No daily activities found');
                return [];
            }

            // Get latest fuel price for equipment calculations
            const latestFuelPrice = await FuelPrice.findOne()
                .sort({ effectiveDate: -1 });

            // Populate all related data for each activity
            const result = await Promise.all(
                dailyActivities.map(async (da) => {
                    const activityDetails = await ActivityDetail.find({ dailyActivityId: da._id })
                        .populate({
                            path: 'workItemId',
                            populate: {
                                path: 'unitId',
                                select: 'name code'
                            }
                        });

                    const equipmentLogs = await EquipmentLog.find({ dailyActivityId: da._id })
                        .populate('equipmentId');

                    const manpowerLogs = await ManpowerLog.find({
                        dailyActivityId: da._id,
                        isActive: true
                    }).populate('role');

                    const materialUsageLogs = await MaterialUsageLog.find({ dailyActivityId: da._id })
                        .populate('materialId');

                    const otherCosts = await OtherCost.find({ dailyActivityId: da._id });

                    // Calculate progress percentage: (progress_volume_hari_ini / target_harian) * 100
                    let progressPercentage = 0;
                    if (da.spkId && da.spkId.workItems && da.spkId.startDate && da.spkId.endDate) {
                        // Calculate total working days
                        const startDate = new Date(da.spkId.startDate);
                        const endDate = new Date(da.spkId.endDate);
                        const totalWorkDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);

                        // Calculate total BOQ volume from SPK
                        const totalBOQVolume = da.spkId.workItems.reduce((total, item) => {
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
                        progressPercentage = targetHarian > 0 ? (progressVolumeHariIni / targetHarian) * 100 : 0;
                        progressPercentage = Math.round(progressPercentage * 100) / 100; // Round to 2 decimal places
                    }

                    const budgetUsage = calculateBudgetUsagePercentage(activityDetails, da.spkId);

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

            console.log('Processed activities:', result.length);
            return result;
        } catch (error) {
            console.error('Error in getDailyActivityWithDetails:', error);
            throw new Error('Terjadi kesalahan saat mengambil data laporan harian');
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
                    description: cost.description,
                    receiptNumber: cost.receiptNumber,
                    remarks: cost.remarks
                }))
            };
        } catch (error) {
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