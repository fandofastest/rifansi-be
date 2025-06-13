const { SPK, WorkItem, Area, Category, SubCategory, Unit } = require('../../models');
const { calculateProgressPercentage } = require('./helpers');
const DailyActivity = require('../../models/DailyActivity');
const MaterialUsageLog = require('../../models/MaterialUsageLog');
const ManpowerLog = require('../../models/ManpowerLog');
const EquipmentLog = require('../../models/EquipmentLog');
const OtherCost = require('../../models/OtherCost');
const PersonnelRole = require('../../models/PersonnelRole');
const Equipment = require('../../models/Equipment');
const ActivityDetail = require('../../models/ActivityDetail');

const Query = {
    spks: async (_, { startDate, endDate, locationId, keyword }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const query = {};
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        if (locationId) {
            query.location = locationId;
        }

        if (keyword) {
            query.$or = [
                { spkNo: { $regex: keyword, $options: 'i' } },
                { wapNo: { $regex: keyword, $options: 'i' } },
                { title: { $regex: keyword, $options: 'i' } },
                { projectName: { $regex: keyword, $options: 'i' } },
                { contractor: { $regex: keyword, $options: 'i' } },
                { workDescription: { $regex: keyword, $options: 'i' } }
            ];
        }

        const spks = await SPK.find(query)
            .populate({
                path: 'location',
                select: 'id name'
            })
            .populate({
                path: 'workItems.workItemId',
                populate: [
                    {
                        path: 'categoryId',
                        select: 'id name'
                    },
                    {
                        path: 'subCategoryId',
                        select: 'id name'
                    },
                    {
                        path: 'unitId',
                        select: 'id name'
                    }
                ]
            })
            .sort({ date: -1 });

        return spks.map(spk => ({
            ...spk.toObject(),
            id: spk._id,
            workItems: spk.workItems?.map(item => ({
                ...item,
                workItemId: item.workItemId?._id || item.workItemId,
                boqVolume: item.boqVolume || { nr: 0, r: 0 },
                amount: item.amount || 0,
                rates: {
                    nr: {
                        rate: item.rates?.nr?.rate ?? 0,
                        description: item.rates?.nr?.description ?? 'Non-remote rate'
                    },
                    r: {
                        rate: item.rates?.r?.rate ?? 0,
                        description: item.rates?.r?.description ?? 'Remote rate'
                    }
                },
                workItem: item.workItemId ? {
                    ...item.workItemId.toObject(),
                    id: item.workItemId._id,
                    category: item.workItemId.categoryId ? {
                        ...item.workItemId.categoryId.toObject(),
                        id: item.workItemId.categoryId._id
                    } : null,
                    subCategory: item.workItemId.subCategoryId ? {
                        ...item.workItemId.subCategoryId.toObject(),
                        id: item.workItemId.subCategoryId._id
                    } : null,
                    unit: item.workItemId.unitId ? {
                        ...item.workItemId.unitId.toObject(),
                        id: item.workItemId.unitId._id
                    } : null
                } : null
            })) || []
        }));
    },

    spk: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const spk = await SPK.findById(id)
            .populate({
                path: 'location',
                select: 'id name'
            })
            .populate({
                path: 'workItems.workItemId',
                populate: [
                    {
                        path: 'categoryId',
                        select: 'id name'
                    },
                    {
                        path: 'subCategoryId',
                        select: 'id name'
                    },
                    {
                        path: 'unitId',
                        select: 'id name'
                    }
                ]
            });

        if (!spk) return null;

        return {
            ...spk.toObject(),
            id: spk._id,
            workItems: spk.workItems?.map(item => ({
                ...item,
                workItemId: item.workItemId?._id || item.workItemId,
                boqVolume: item.boqVolume || { nr: 0, r: 0 },
                amount: item.amount || 0,
                rates: {
                    nr: {
                        rate: item.rates?.nr?.rate ?? 0,
                        description: item.rates?.nr?.description ?? 'Non-remote rate'
                    },
                    r: {
                        rate: item.rates?.r?.rate ?? 0,
                        description: item.rates?.r?.description ?? 'Remote rate'
                    }
                },
                workItem: item.workItemId ? {
                    ...item.workItemId.toObject(),
                    id: item.workItemId._id,
                    category: item.workItemId.categoryId ? {
                        ...item.workItemId.categoryId.toObject(),
                        id: item.workItemId.categoryId._id
                    } : null,
                    subCategory: item.workItemId.subCategoryId ? {
                        ...item.workItemId.subCategoryId.toObject(),
                        id: item.workItemId.subCategoryId._id
                    } : null,
                    unit: item.workItemId.unitId ? {
                        ...item.workItemId.unitId.toObject(),
                        id: item.workItemId.unitId._id
                    } : null
                } : null
            })) || []
        };
    },

    workItems: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const workItems = await WorkItem.find()
            .populate('categoryId')
            .populate('subCategoryId')
            .populate('unitId');

        return workItems.map(item => ({
            ...item.toObject(),
            id: item._id,
            categoryId: item.categoryId?._id,
            subCategoryId: item.subCategoryId?._id,
            unitId: item.unitId?._id,
            category: item.categoryId ? {
                id: item.categoryId._id,
                name: item.categoryId.name
            } : null,
            subCategory: item.subCategoryId ? {
                id: item.subCategoryId._id,
                name: item.subCategoryId.name
            } : null,
            unit: item.unitId ? {
                id: item.unitId._id,
                name: item.unitId.name
            } : null
        }));
    },

    subCategories: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const subCategories = await SubCategory.find()
            .populate('categoryId');

        return subCategories.map(subCategory => ({
            ...subCategory.toObject(),
            id: subCategory._id,
            categoryId: subCategory.categoryId?._id,
            category: subCategory.categoryId ? {
                id: subCategory.categoryId._id,
                name: subCategory.categoryId.name
            } : null
        }));
    },

    subCategoriesByCategory: async (_, { categoryId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const subCategories = await SubCategory.find({ categoryId })
            .populate('categoryId');

        return subCategories.map(subCategory => ({
            ...subCategory.toObject(),
            id: subCategory._id,
            categoryId: subCategory.categoryId?._id,
            category: subCategory.categoryId ? {
                id: subCategory.categoryId._id,
                name: subCategory.categoryId.name
            } : null
        }));
    },

    units: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const units = await Unit.find();

        return units.map(unit => ({
            ...unit.toObject(),
            id: unit._id
        }));
    },

    unit: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const unit = await Unit.findById(id);
        if (!unit) return null;

        return {
            ...unit.toObject(),
            id: unit._id
        };
    },

    spkDetailsWithProgress: async (_, { spkId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const spk = await SPK.findById(spkId)
            .populate({
                path: 'location',
                select: 'id name'
            })
            .populate({
                path: 'workItems.workItemId',
                populate: [
                    {
                        path: 'categoryId',
                        select: 'id name'
                    },
                    {
                        path: 'subCategoryId',
                        select: 'id name'
                    },
                    {
                        path: 'unitId',
                        select: 'id name'
                    }
                ]
            });

        if (!spk) throw new Error('SPK not found');

        // Debug log tambahan
        console.log('DAFTAR workItemId di spk.workItems:', spk.workItems.map(item => String(item.workItemId)));

        // Get all daily activities for this SPK
        const dailyActivities = await DailyActivity.find({ spkId: spk._id })
            .populate('createdBy', 'fullName')
            .populate('spkId', 'spkNo title') || [];

        // Get all activity details for these daily activities
        const activityDetails = await ActivityDetail.find({
            dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }).populate({
            path: 'workItemId',
            populate: [
                {
                    path: 'categoryId',
                    select: 'id name'
                },
                {
                    path: 'subCategoryId',
                    select: 'id name'
                },
                {
                    path: 'unitId',
                    select: 'id name'
                }
            ]
        });

        // Get all cost logs with complete data
        const materialLogs = await MaterialUsageLog.find({
            dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }).populate({
            path: 'materialId',
            select: 'name unitId unitRate',
            populate: {
                path: 'unitId',
                select: 'name'
            }
        }) || [];

        const manpowerLogs = await ManpowerLog.find({
            dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }).populate({
            path: 'role',
            select: 'roleName'
        }) || [];

        const equipmentLogs = await EquipmentLog.find({
            dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }).populate({
            path: 'equipmentId',
            select: 'id equipmentCode plateOrSerialNo equipmentType name'
        }) || [];

        const otherCostLogs = await OtherCost.find({
            dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }) || [];

        // Group activity details by daily activity
        const activityDetailsByDailyActivity = activityDetails.reduce((acc, detail) => {
            if (!detail || !detail.dailyActivityId) return acc;
            const daId = detail.dailyActivityId.toString();
            if (!acc[daId]) {
                acc[daId] = [];
            }
            acc[daId].push(detail);
            return acc;
        }, {});

        // Group cost logs by daily activity
        const materialLogsByDailyActivity = materialLogs.reduce((acc, log) => {
            if (!log || !log.dailyActivityId) return acc;
            const daId = log.dailyActivityId.toString();
            if (!acc[daId]) {
                acc[daId] = [];
            }
            acc[daId].push(log);
            return acc;
        }, {});

        const manpowerLogsByDailyActivity = manpowerLogs.reduce((acc, log) => {
            if (!log || !log.dailyActivityId) return acc;
            const daId = log.dailyActivityId.toString();
            if (!acc[daId]) {
                acc[daId] = [];
            }
            acc[daId].push(log);
            return acc;
        }, {});

        const equipmentLogsByDailyActivity = equipmentLogs.reduce((acc, log) => {
            if (!log || !log.dailyActivityId) return acc;
            const daId = log.dailyActivityId.toString();
            if (!acc[daId]) {
                acc[daId] = [];
            }
            acc[daId].push(log);
            return acc;
        }, {});

        const otherCostLogsByDailyActivity = otherCostLogs.reduce((acc, log) => {
            if (!log || !log.dailyActivityId) return acc;
            const daId = log.dailyActivityId.toString();
            if (!acc[daId]) {
                acc[daId] = [];
            }
            acc[daId].push(log);
            return acc;
        }, {});

        // Jika belum ada daily activities, buat satu entry default dengan work items dari SPK
        let formattedDailyActivities = [];
        
        if (dailyActivities.length === 0) {
            // Buat default daily activity dengan semua work items dari SPK
            const defaultWorkItems = spk.workItems.map(spkWorkItem => {
                const workItemData = spkWorkItem.workItemId;
                if (!workItemData) return null;
                
                const boqVolume = {
                    nr: spkWorkItem.boqVolume?.nr || 0,
                    r: spkWorkItem.boqVolume?.r || 0
                };
                
                return {
                    id: workItemData._id?.toString() || workItemData.toString(),
                    name: workItemData.name || '',
                    description: workItemData.description || '',
                    categoryId: workItemData.categoryId?._id?.toString() || workItemData.categoryId?.toString() || null,
                    subCategoryId: workItemData.subCategoryId?._id?.toString() || workItemData.subCategoryId?.toString() || null,
                    unitId: workItemData.unitId?._id?.toString() || workItemData.unitId?.toString() || null,
                    category: workItemData.categoryId ? {
                        id: workItemData.categoryId._id?.toString() || workItemData.categoryId.toString(),
                        name: workItemData.categoryId.name || '',
                        code: workItemData.categoryId.code || ''
                    } : null,
                    subCategory: workItemData.subCategoryId ? {
                        id: workItemData.subCategoryId._id?.toString() || workItemData.subCategoryId.toString(),
                        name: workItemData.subCategoryId.name || ''
                    } : null,
                    unit: workItemData.unitId ? {
                        id: workItemData.unitId._id?.toString() || workItemData.unitId.toString(),
                        name: workItemData.unitId.name || '',
                        code: workItemData.unitId.code || ''
                    } : null,
                    rates: {
                        nr: {
                            rate: workItemData.rates?.nr?.rate ?? 0,
                            description: workItemData.rates?.nr?.description ?? 'Non-remote rate'
                        },
                        r: {
                            rate: workItemData.rates?.r?.rate ?? 0,
                            description: workItemData.rates?.r?.description ?? 'Remote rate'
                        }
                    },
                    boqVolume,
                    actualQuantity: { nr: 0, r: 0 },
                    lastUpdatedAt: null,
                    dailyProgress: { nr: 0, r: 0 },
                    progressAchieved: { nr: 0, r: 0 },
                    dailyCost: { nr: 0, r: 0 }
                };
            }).filter(Boolean);
            
            formattedDailyActivities = [{
                id: 'no-activity',
                date: new Date().toISOString(),
                location: '',
                weather: '',
                status: 'No Activity',
                workStartTime: '',
                workEndTime: '',
                createdBy: '',
                closingRemarks: '',
                workItems: defaultWorkItems,
                costs: {
                    materials: { totalCost: 0, items: [] },
                    manpower: { totalCost: 0, items: [] },
                    equipment: { totalCost: 0, items: [] },
                    otherCosts: { totalCost: 0, items: [] }
                }
            }];
        } else {
            // Format daily activities with their work items and costs
            formattedDailyActivities = dailyActivities.map(da => {
            if (!da || !da._id) return null;
            const daId = da._id.toString();
            const activityDetails = activityDetailsByDailyActivity[daId] || [];
            const materialLogs = materialLogsByDailyActivity[daId] || [];
            const manpowerLogs = manpowerLogsByDailyActivity[daId] || [];
            const equipmentLogs = equipmentLogsByDailyActivity[daId] || [];
            const otherCostLogs = otherCostLogsByDailyActivity[daId] || [];

            // Hitung total hari kerja dari startDate dan endDate SPK
            const start = spk.startDate ? new Date(spk.startDate) : null;
            const end = spk.endDate ? new Date(spk.endDate) : null;
            const totalHariKerja = (start && end) ? Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1) : 1;

            // Format work items
            const workItems = activityDetails.map(detail => {
                if (!detail || !detail.workItemId) return null;
                const workItemData = detail.workItemId;
                // Fungsi bantu untuk ambil ID
                const getId = (val) => {
                    if (!val) return '';
                    if (typeof val === 'string') return val;
                    if (val._id) return String(val._id);
                    return String(val);
                };
                const spkWorkItem = spk.workItems.find(item =>
                    getId(item.workItemId) === getId(workItemData._id)
                );
                const boqVolume = spkWorkItem ? {
                    nr: spkWorkItem.boqVolume?.nr || 0,
                    r: spkWorkItem.boqVolume?.r || 0
                } : { nr: 0, r: 0 };
                return {
                    id: workItemData._id?.toString() || workItemData.toString(),
                    name: workItemData.name || '',
                    description: workItemData.description || '',
                    categoryId: workItemData.categoryId?._id?.toString() || workItemData.categoryId?.toString() || null,
                    subCategoryId: workItemData.subCategoryId?._id?.toString() || workItemData.subCategoryId?.toString() || null,
                    unitId: workItemData.unitId?._id?.toString() || workItemData.unitId?.toString() || null,
                    category: workItemData.categoryId ? {
                        id: workItemData.categoryId._id?.toString() || workItemData.categoryId.toString(),
                        name: workItemData.categoryId.name || '',
                        code: workItemData.categoryId.code || ''
                    } : null,
                    subCategory: workItemData.subCategoryId ? {
                        id: workItemData.subCategoryId._id?.toString() || workItemData.subCategoryId.toString(),
                        name: workItemData.subCategoryId.name || ''
                    } : null,
                    unit: workItemData.unitId ? {
                        id: workItemData.unitId._id?.toString() || workItemData.unitId.toString(),
                        name: workItemData.unitId.name || '',
                        code: workItemData.unitId.code || ''
                    } : null,
                    rates: {
                        nr: {
                            rate: workItemData.rates?.nr?.rate ?? 0,
                            description: workItemData.rates?.nr?.description ?? 'Non-remote rate'
                        },
                        r: {
                            rate: workItemData.rates?.r?.rate ?? 0,
                            description: workItemData.rates?.r?.description ?? 'Remote rate'
                        }
                    },
                    boqVolume,
                    actualQuantity: detail.actualQuantity || { nr: 0, r: 0 },
                    lastUpdatedAt: detail.updatedAt?.toISOString() || null,
                    dailyProgress: {
                        nr: boqVolume.nr / totalHariKerja,
                        r: boqVolume.r / totalHariKerja
                    },
                    progressAchieved: {
                        nr: boqVolume.nr > 0 ? ((detail.actualQuantity?.nr || 0) / boqVolume.nr) * 100 : 0,
                        r: boqVolume.r > 0 ? ((detail.actualQuantity?.r || 0) / boqVolume.r) * 100 : 0
                    },
                    dailyCost: {
                        nr: (boqVolume.nr / totalHariKerja) * (workItemData.rates?.nr?.rate ?? 0),
                        r: (boqVolume.r / totalHariKerja) * (workItemData.rates?.r?.rate ?? 0)
                    }
                };
            }).filter(Boolean);

            // Format costs
            const costs = {
                materials: {
                    totalCost: materialLogs.reduce((sum, log) => {
                        if (!log || !log.materialId) return sum;
                        return sum + (log.quantity * (log.materialId?.unitRate || 0));
                    }, 0),
                    items: materialLogs.map(log => {
                        if (!log || !log.materialId) return null;
                        return {
                            material: log.materialId?.name || 'Unknown Material',
                            quantity: log.quantity || 0,
                            unit: log.materialId?.unitId?.name || '-',
                            unitRate: log.materialId?.unitRate || 0,
                            cost: log.quantity * (log.materialId?.unitRate || 0)
                        };
                    }).filter(Boolean)
                },
                manpower: {
                    totalCost: manpowerLogs.reduce((sum, log) => {
                        if (!log || !log.role) return sum;
                        return sum + (log.workingHours * log.personCount * log.hourlyRate);
                    }, 0),
                    items: manpowerLogs.map(log => {
                        if (!log || !log.role) return null;
                        return {
                            role: log.role?.roleName || 'Unknown Role',
                            numberOfWorkers: log.personCount || 0,
                            workingHours: log.workingHours || 0,
                            hourlyRate: log.hourlyRate || 0,
                            cost: log.workingHours * log.personCount * log.hourlyRate
                        };
                    }).filter(Boolean)
                },
                equipment: {
                    totalCost: equipmentLogs.reduce((sum, log) => {
                        if (!log) return sum;
                        const fuelCost = (log.fuelIn - log.fuelRemaining) * log.fuelPrice;
                        const rentalCost = log.workingHour * log.hourlyRate;
                        return sum + fuelCost + rentalCost;
                    }, 0),
                    items: equipmentLogs.map(log => {
                        if (!log || !log.equipmentId) return null;
                        return {
                            equipment: log.equipmentId ? {
                                id: log.equipmentId._id?.toString() || log.equipmentId.id || '',
                                equipmentCode: log.equipmentId.equipmentCode || '',
                                plateOrSerialNo: log.equipmentId.plateOrSerialNo || '',
                                equipmentType: log.equipmentId.equipmentType || '',
                                name: log.equipmentId.name || ''
                            } : null,
                            workingHours: log.workingHour || 0,
                            hourlyRate: log.hourlyRate || 0,
                            rentalRatePerDay: log.rentalRatePerDay || 0,
                            fuelUsed: (log.fuelIn - log.fuelRemaining) || 0,
                            fuelPrice: log.fuelPrice || 0,
                            cost: ((log.fuelIn - log.fuelRemaining) * log.fuelPrice) + (log.workingHour * log.hourlyRate)
                        };
                    }).filter(Boolean)
                },
                otherCosts: {
                    totalCost: otherCostLogs.reduce((sum, log) => {
                        if (!log) return sum;
                        return sum + (log.amount || 0);
                    }, 0),
                    items: otherCostLogs.map(log => {
                        if (!log) return null;
                        return {
                            description: log.description || 'No Description',
                            cost: log.amount || 0
                        };
                    }).filter(Boolean)
                }
            };

            return {
                id: da._id.toString(),
                date: da.date?.toISOString() || null,
                location: da.location || '',
                weather: da.weather || '',
                status: da.status || '',
                workStartTime: da.workStartTime || '',
                workEndTime: da.workEndTime || '',
                createdBy: da.createdBy ? da.createdBy.fullName : '',
                closingRemarks: da.closingRemarks || '',
                workItems,
                costs
            };
        }).filter(Boolean);
        }

        // Calculate total costs
        const totalCosts = formattedDailyActivities.reduce((total, da) => {
            return total +
                da.costs.materials.totalCost +
                da.costs.manpower.totalCost +
                da.costs.equipment.totalCost +
                da.costs.otherCosts.totalCost;
        }, 0);

        const spkObj = spk.toObject();
        return {
            id: spkObj._id.toString(),
            spkNo: spkObj.spkNo,
            wapNo: spkObj.wapNo,
            title: spkObj.title,
            projectName: spkObj.projectName,
            date: spkObj.date.toISOString(),
            contractor: spkObj.contractor,
            workDescription: spkObj.workDescription,
            location: {
                id: spkObj.location?._id?.toString() || spkObj.location?.toString(),
                name: spkObj.location?.name || ''
            },
            startDate: spkObj.startDate ? spkObj.startDate.toISOString() : null,
            endDate: spkObj.endDate ? spkObj.endDate.toISOString() : null,
            budget: spkObj.budget || 0,
            dailyActivities: formattedDailyActivities,
            totalProgress: {
                percentage: spkObj.budget > 0 ? (totalCosts / spkObj.budget) * 100 : 0,
                totalBudget: spkObj.budget || 0,
                totalSpent: totalCosts,
                remainingBudget: (spkObj.budget || 0) - totalCosts
            },
            createdAt: spkObj.createdAt.toISOString(),
            updatedAt: spkObj.updatedAt.toISOString()
        };
    }
};

const Mutation = {
    createSPK: async (_, { input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const spk = new SPK({
            ...input,
            date: new Date(input.date),
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined
        });

        return spk.save();
    },

    updateSPK: async (_, { id, input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const updateData = { ...input };
        if (input.date) updateData.date = new Date(input.date);
        if (input.startDate) updateData.startDate = new Date(input.startDate);
        if (input.endDate) updateData.endDate = new Date(input.endDate);

        return SPK.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).populate('location');
    },

    deleteSPK: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const result = await SPK.findByIdAndDelete(id);
        return !!result;
    },

    addWorkItemToSPK: async (_, { spkId, input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const spk = await SPK.findById(spkId);
        if (!spk) throw new Error('SPK not found');

        const workItem = await WorkItem.findById(input.workItemId);
        if (!workItem) throw new Error('WorkItem not found');

        const existingWorkItem = spk.workItems.find(
            item => item.workItemId.toString() === input.workItemId
        );

        if (existingWorkItem) {
            throw new Error('WorkItem already exists in this SPK');
        }

        const amount = (input.boqVolume.nr * input.rates.nr.rate) +
            (input.boqVolume.r * input.rates.r.rate);

        spk.workItems.push({
            ...input,
            amount
        });

        return spk.save();
    },

    removeWorkItemFromSPK: async (_, { spkId, workItemId }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const spk = await SPK.findById(spkId);
        if (!spk) throw new Error('SPK not found');
        spk.workItems = spk.workItems.filter(item => item.workItemId.toString() !== workItemId);
        await spk.save();
        return spk;
    },

    updateSPKWorkItem: async (_, { spkId, workItemId, input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const spk = await SPK.findById(spkId);
        if (!spk) throw new Error('SPK not found');

        const workItemIndex = spk.workItems.findIndex(
            item => item.workItemId.toString() === workItemId
        );

        if (workItemIndex === -1) {
            throw new Error('WorkItem not found in this SPK');
        }

        const updateData = { ...input };

        if (input.boqVolume || input.rates) {
            const currentItem = spk.workItems[workItemIndex];
            const boqVolume = input.boqVolume || currentItem.boqVolume;
            const rates = input.rates || currentItem.rates;

            updateData.amount = (boqVolume.nr * rates.nr.rate) +
                (boqVolume.r * rates.r.rate);
        }

        spk.workItems[workItemIndex] = {
            ...spk.workItems[workItemIndex],
            ...updateData
        };

        return spk.save();
    }
};

const SPKResolvers = {
    location: async (parent) => {
        return Area.findById(parent.location);
    }
};

const SPKWorkItemResolvers = {
    workItem: async (parent) => {
        return WorkItem.findById(parent.workItemId);
    }
};

const WorkItemResolvers = {
    category: async (parent) => {
        if (!parent.categoryId) return null;
        return Category.findById(parent.categoryId);
    },
    subCategory: async (parent) => {
        if (!parent.subCategoryId) return null;
        return SubCategory.findById(parent.subCategoryId);
    },
    unit: async (parent) => {
        if (!parent.unitId) return null;
        return Unit.findById(parent.unitId);
    }
};

module.exports = {
    Query,
    Mutation,
    SPK: SPKResolvers,
    SPKWorkItem: SPKWorkItemResolvers,
    WorkItem: WorkItemResolvers
}; 