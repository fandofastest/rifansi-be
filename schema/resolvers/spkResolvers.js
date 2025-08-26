const { SPK, WorkItem, Area, Category, SubCategory, Unit } = require('../../models');
const { calculateProgressPercentage, calculateBOQProgressPercentage } = require('./helpers');
const DailyActivity = require('../../models/DailyActivity');
const MaterialUsageLog = require('../../models/MaterialUsageLog');
const ManpowerLog = require('../../models/ManpowerLog');
const EquipmentLog = require('../../models/EquipmentLog');
const OtherCost = require('../../models/OtherCost');
const PersonnelRole = require('../../models/PersonnelRole');
const Equipment = require('../../models/Equipment');
const ActivityDetail = require('../../models/ActivityDetail');

const Query = {
    spks: async (_, { startDate, endDate, locationId, keyword, status }, { user }) => {
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
        
        // Filter by status jika parameter status diberikan
        // Jika tidak, maka tampilkan semua SPK (termasuk yang status-nya kosong atau null)
        // SPK dengan status kosong akan diubah menjadi 'active' oleh middleware
        if (status) {
            query.status = status;
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
            
        // Identifikasi SPK yang tidak memiliki status di database dan update mereka
        for (const spk of spks) {
            // Periksa dokumen asli sebelum middleware mengubahnya
            // Untuk memastikan kita hanya update yang benar-benar null di database
            const originalDoc = await SPK.findById(spk._id).lean();
            
            if (!originalDoc.status || originalDoc.status === '') {
                console.log(`Updating SPK ${spk._id} status to 'active' - original status: ${originalDoc.status}`);
                try {
                    const updated = await SPK.findByIdAndUpdate(spk._id, 
                        { $set: { status: 'active' } }, 
                        { new: true }
                    );
                    console.log(`Successfully updated SPK ${spk._id}, new status: ${updated.status}`);
                    // Pastikan status di objek yang akan dikembalikan sudah diperbarui
                    spk.status = 'active';
                } catch (error) {
                    console.error(`Error updating SPK ${spk._id} status:`, error);
                }
            }
        }

        return spks.map(spk => {
            // Logging dokumen sebelum diubah oleh toObject()
            console.log(`[Resolver - spks] Dokumen SPK ${spk._id} sebelum toObject(), status: ${spk.status}`);
            
            // Buat object hasil dan pastikan status tidak kosong
            // Lihat detail spk object sebelum toObject()
            console.log(`[Resolver Detail] SPK ${spk._id} spk.__proto__:`, Object.getPrototypeOf(spk));
            console.log(`[Resolver Detail] SPK ${spk._id} mongoose methods:`, typeof spk.toObject, typeof spk.save);
            
            // Pastikan kita mendapatkan status mentah yang disimpan di database
            const spkRaw = spk._doc || spk;
            console.log(`[Resolver Raw] SPK ${spk._id} status raw from _doc:`, spkRaw.status);
            
            // Buat object hasil dengan menyebutkan status secara eksplisit
            const spkObj = spk.toObject();
            console.log(`[Resolver Detail] SPK ${spk._id} after toObject() status:`, spkObj.status);
            
            const result = {
                ...spkObj,
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
                })) || [],
                totalWorkItems: spk.workItems?.length || 0
            };
            
            // Pastikan status tidak kosong/null dalam hasil yang dikembalikan
            if (!result.status) {
                console.log(`[Resolver - spks] Fixing empty status in result for SPK ${spk._id}`);
                result.status = 'active';
            } else {
                console.log(`[Resolver - spks] Result status for SPK ${spk._id}: ${result.status}`);
            }
            
            return result;
        });
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
        
        // Identifikasi SPK yang tidak memiliki status di database dan update mereka
        // Periksa dokumen asli sebelum middleware mengubahnya
        const originalDoc = await SPK.findById(id).lean();
        
        if (!originalDoc.status || originalDoc.status === '') {
            console.log(`Updating single SPK ${spk._id} status to 'active' - original status: ${originalDoc.status}`);
            try {
                const updated = await SPK.findByIdAndUpdate(spk._id, 
                    { $set: { status: 'active' } }, 
                    { new: true }
                );
                console.log(`Successfully updated SPK ${spk._id}, new status: ${updated.status}`);
                // Pastikan status di objek yang akan dikembalikan sudah diperbarui
                spk.status = 'active';
            } catch (error) {
                console.error(`Error updating SPK ${spk._id} status:`, error);
            }
        }

        console.log(`[Resolver - spk] Single SPK ${spk._id} sebelum toObject(), status: ${spk.status}`);
        
        // Lihat detail spk object sebelum toObject()
        console.log(`[Single Resolver Detail] SPK ${spk._id} spk.__proto__:`, Object.getPrototypeOf(spk));
        console.log(`[Single Resolver Detail] SPK ${spk._id} mongoose methods:`, typeof spk.toObject, typeof spk.save);
            
        // Pastikan kita mendapatkan status mentah yang disimpan di database
        const spkRaw = spk._doc || spk;
        console.log(`[Single Resolver Raw] SPK ${spk._id} status raw from _doc:`, spkRaw.status);
        
        // Buat object hasil dengan menyebutkan status secara eksplisit
        const spkObj = spk.toObject();
        console.log(`[Single Resolver Detail] SPK ${spk._id} after toObject() status:`, spkObj.status);
        
        // Buat object hasil
        const result = {
            ...spkObj,
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
            })) || [],
            totalWorkItems: spk.workItems?.length || 0
        };
        
        // Pastikan status tidak kosong/null dalam hasil yang dikembalikan
        if (!result.status) {
            console.log(`[Resolver - spk] Fixing empty status in result for SPK ${spk._id}`);
            result.status = 'active';
        } else {
            console.log(`[Resolver - spk] Result status for SPK ${spk._id}: ${result.status}`);
        }
        
        return result;
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

        // Filter subCategory yang categoryId-nya null
        return subCategories
            .filter(subCategory => subCategory.categoryId)
            .map(subCategory => ({
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

    spkDetailsWithProgress: async (_, { spkId, startDate, endDate }, { user }) => {
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

        // Build date filter if provided
        const daFilter = { spkId: spk._id };
        if (startDate || endDate) {
            daFilter.date = {};
            if (startDate) daFilter.date.$gte = new Date(startDate);
            if (endDate) {
                // include the entire end day by setting time to 23:59:59.999
                const end = new Date(endDate);
                if (!isNaN(end)) {
                    end.setHours(23, 59, 59, 999);
                }
                daFilter.date.$lte = end;
            }
        }

        // Get daily activities for this SPK with optional date range
        const dailyActivities = await DailyActivity.find(daFilter)
            .populate('createdBy', 'fullName')
            .populate('spkId', 'spkNo title') || [];

        console.log(`[SPK Progress Debug] SPK ID: ${spkId}`);
        console.log(`[SPK Progress Debug] Date Filter:`, { startDate, endDate, daFilterDate: daFilter.date });
        console.log(`[SPK Progress Debug] Daily Activities Count: ${dailyActivities.length}`);

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

        console.log(`[SPK Progress Debug] Activity Details Count: ${activityDetails.length}`);
        console.log(`[SPK Progress Debug] Activity Details with actualQuantity:`,
            activityDetails.map(detail => ({
                workItemId: detail.workItemId?._id || detail.workItemId,
                actualQuantity: detail.actualQuantity
            }))
        );

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
                            rate: spkWorkItem.rates?.nr?.rate ?? 0,
                            description: spkWorkItem.rates?.nr?.description ?? 'Non-remote rate'
                        },
                        r: {
                            rate: spkWorkItem.rates?.r?.rate ?? 0,
                            description: spkWorkItem.rates?.r?.description ?? 'Remote rate'
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
                totalWorkItems: defaultWorkItems.length,
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
                const workItemsMap = {};

                // Build from existing activity details
                activityDetails.forEach(detail => {
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
                    const obj = {
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
                        rates: spkWorkItem ? {
                            nr: {
                                rate: spkWorkItem.rates?.nr?.rate ?? 0,
                                description: spkWorkItem.rates?.nr?.description ?? 'Non-remote rate'
                            },
                            r: {
                                rate: spkWorkItem.rates?.r?.rate ?? 0,
                                description: spkWorkItem.rates?.r?.description ?? 'Remote rate'
                            }
                        } : {
                            nr: { rate: 0, description: 'Non-remote rate' },
                            r: { rate: 0, description: 'Remote rate' }
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
                            nr: (boqVolume.nr / totalHariKerja) * (spkWorkItem?.rates?.nr?.rate ?? 0),
                            r: (boqVolume.r / totalHariKerja) * (spkWorkItem?.rates?.r?.rate ?? 0)
                        }
                    };
                    workItemsMap[obj.id] = obj;
                });

                // Add placeholder for work items with no activity yet
                spk.workItems.forEach(swi => {
                    const wid = (swi.workItemId._id || swi.workItemId).toString();
                    if (workItemsMap[wid]) return;

                    const wiData = swi.workItemId;
                    if (!wiData) return;
                    workItemsMap[wid] = {
                        id: wid,
                        name: wiData.name || '',
                        description: wiData.description || '',
                        categoryId: wiData.categoryId?._id?.toString() || wiData.categoryId?.toString() || null,
                        subCategoryId: wiData.subCategoryId?._id?.toString() || wiData.subCategoryId?.toString() || null,
                        unitId: wiData.unitId?._id?.toString() || wiData.unitId?.toString() || null,
                        category: wiData.categoryId ? {
                            id: wiData.categoryId._id?.toString() || wiData.categoryId.toString(),
                            name: wiData.categoryId.name || '',
                            code: wiData.categoryId.code || ''
                        } : null,
                        subCategory: wiData.subCategoryId ? {
                            id: wiData.subCategoryId._id?.toString() || wiData.subCategoryId.toString(),
                            name: wiData.subCategoryId.name || ''
                        } : null,
                        unit: wiData.unitId ? {
                            id: wiData.unitId._id?.toString() || wiData.unitId.toString(),
                            name: wiData.unitId.name || '',
                            code: wiData.unitId.code || ''
                        } : null,
                        rates: {
                            nr: {
                                rate: swi.rates?.nr?.rate ?? 0,
                                description: swi.rates?.nr?.description ?? 'Non-remote rate'
                            },
                            r: {
                                rate: swi.rates?.r?.rate ?? 0,
                                description: swi.rates?.r?.description ?? 'Remote rate'
                            }
                        },
                        boqVolume: {
                            nr: swi.boqVolume?.nr || 0,
                            r: swi.boqVolume?.r || 0
                        },
                        actualQuantity: { nr: 0, r: 0 },
                        lastUpdatedAt: null,
                        dailyProgress: {
                            nr: (swi.boqVolume?.nr || 0) / totalHariKerja,
                            r: (swi.boqVolume?.r || 0) / totalHariKerja
                        },
                        progressAchieved: { nr: 0, r: 0 },
                        dailyCost: {
                            nr: ((swi.boqVolume?.nr || 0) / totalHariKerja) * (swi.rates?.nr?.rate ?? 0),
                            r: ((swi.boqVolume?.r || 0) / totalHariKerja) * (swi.rates?.r?.rate ?? 0)
                        }
                    };
                });

                const workItems = Object.values(workItemsMap);

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
                    totalWorkItems: workItems.length,
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

        // Calculate total BOQ volumes for target and completed
        const allActivityDetails = activityDetails || [];

        const totalTargetBOQ = spk.workItems.reduce((total, item) => {
            const nr = item.boqVolume?.nr || 0;
            const r = item.boqVolume?.r || 0;
            console.log(`[BOQ Debug] Work Item: ${item.workItemId} - Target BOQ: nr=${nr}, r=${r}`);
            return total + nr + r;
        }, 0);

        console.log(`[BOQ Debug] Total Target BOQ: ${totalTargetBOQ}`);

        const totalCompletedBOQ = allActivityDetails.reduce((total, detail) => {
            const nr = detail.actualQuantity?.nr || 0;
            const r = detail.actualQuantity?.r || 0;
            console.log(`[BOQ Debug] Activity Detail: ${detail.workItemId?._id || detail.workItemId} - Actual Quantity: nr=${nr}, r=${r}`);
            return total + nr + r;
        }, 0);

        console.log(`[BOQ Debug] Total Completed BOQ: ${totalCompletedBOQ}`);

        const remainingBOQ = totalTargetBOQ - totalCompletedBOQ;

        // Calculate BOQ-based progress percentage: (completed / target) * 100
        const boqProgressPercentage = totalTargetBOQ > 0 ? (totalCompletedBOQ / totalTargetBOQ) * 100 : 0;

        console.log(`[BOQ Debug] BOQ Progress Percentage: ${boqProgressPercentage}%`);

        // Calculate total sales = sum of (actualQuantity.nr * nrRate + actualQuantity.r * rRate)
        // Prefer rates stored on ActivityDetail (historical integrity). Fallback to SPK's workItems rates.
        const ratesByWorkItemId = new Map(
            spk.workItems.map(item => [
                String(item.workItemId?._id || item.workItemId),
                {
                    nr: item.rates?.nr?.rate ?? 0,
                    r: item.rates?.r?.rate ?? 0
                }
            ])
        );

        const totalSales = (activityDetails || []).reduce((sum, detail) => {
            const qtyNr = detail.actualQuantity?.nr || 0;
            const qtyR = detail.actualQuantity?.r || 0;
            const detailNrRate = detail.rates?.nr?.rate;
            const detailRRate = detail.rates?.r?.rate;
            const hasDetailRates = (typeof detailNrRate === 'number' && typeof detailRRate === 'number') &&
                ((detailNrRate ?? 0) > 0 || (detailRRate ?? 0) > 0);

            let nrRate = 0;
            let rRate = 0;

            if (hasDetailRates) {
                nrRate = detailNrRate || 0;
                rRate = detailRRate || 0;
            } else {
                const workItemId = String(detail.workItemId?._id || detail.workItemId || '');
                const fallback = ratesByWorkItemId.get(workItemId) || { nr: 0, r: 0 };
                nrRate = fallback.nr;
                rRate = fallback.r;
            }

            return sum + (qtyNr * nrRate) + (qtyR * rRate);
        }, 0);

        // Build per-day total sales details from ActivityDetails
        const activityDateById = new Map(
            (dailyActivities || []).map(da => [String(da._id), da.date ? da.date.toISOString() : null])
        );
        const salesByDaily = new Map();
        (activityDetails || []).forEach(detail => {
            const daId = String(detail.dailyActivityId || '');
            if (!daId) return;
            const qtyNr = detail.actualQuantity?.nr || 0;
            const qtyR = detail.actualQuantity?.r || 0;
            const detailNrRate = detail.rates?.nr?.rate;
            const detailRRate = detail.rates?.r?.rate;
            const hasDetailRates = (typeof detailNrRate === 'number' && typeof detailRRate === 'number') &&
                ((detailNrRate ?? 0) > 0 || (detailRRate ?? 0) > 0);
            let nrRate = 0;
            let rRate = 0;
            if (hasDetailRates) {
                nrRate = detailNrRate || 0;
                rRate = detailRRate || 0;
            } else {
                const workItemId = String(detail.workItemId?._id || detail.workItemId || '');
                const fb = ratesByWorkItemId.get(workItemId) || { nr: 0, r: 0 };
                nrRate = fb.nr;
                rRate = fb.r;
            }
            const lineTotal = (qtyNr * nrRate) + (qtyR * rRate);
            salesByDaily.set(daId, (salesByDaily.get(daId) || 0) + lineTotal);
        });
        const totalSalesDetails = Array.from(salesByDaily.entries())
            .map(([dailyActivityId, amount]) => ({
                dailyActivityId,
                date: activityDateById.get(dailyActivityId) || null,
                totalSales: amount
            }))
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

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
                percentage: Math.round(boqProgressPercentage * 100) / 100,
                totalTargetBOQ: totalTargetBOQ,
                totalCompletedBOQ: totalCompletedBOQ,
                remainingBOQ: remainingBOQ,
                // Keep financial data for reference
                totalBudget: spkObj.budget || 0,
                totalSpent: totalCosts,
                remainingBudget: (spkObj.budget || 0) - totalCosts,
                totalSales: totalSales,
                totalSalesDetails: totalSalesDetails
            },
            createdAt: spkObj.createdAt.toISOString(),
            updatedAt: spkObj.updatedAt.toISOString()
        };
    },

    spkWithProgressBySpkId: async (_, { spkId }, { user }) => {
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

        console.log(`[SPK Progress Summary] SPK ID: ${spkId}`);

        // Get all daily activities for this SPK
        const dailyActivities = await DailyActivity.find({ spkId: spk._id }) || [];

        // Get all activity details for these daily activities
        const activityDetails = await ActivityDetail.find({
            dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }).populate('workItemId');

        // Get all cost logs for comprehensive budget tracking
        const materialLogs = await MaterialUsageLog.find({
            dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }).populate({
            path: 'materialId',
            select: 'name unitRate',
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
            select: 'name equipmentCode'
        }) || [];

        const otherCosts = await OtherCost.find({
            dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }) || [];

        console.log(`[SPK Progress Summary] Activity Details Count: ${activityDetails.length}`);

        // Group activity details by work item ID to calculate progress per work item
        const progressByWorkItem = {};

        // Ensure every work item is represented even if it has no progress yet
        spk.workItems.forEach(item => {
            const wid = (item.workItemId._id || item.workItemId).toString();
            if (!progressByWorkItem[wid]) {
                progressByWorkItem[wid] = {
                    totalNr: 0,
                    totalR: 0
                };
            }
        });

        activityDetails.forEach(detail => {
            if (!detail.workItemId) return;

            const workItemId = detail.workItemId._id.toString();
            if (!progressByWorkItem[workItemId]) {
                progressByWorkItem[workItemId] = {
                    totalNr: 0,
                    totalR: 0
                };
            }

            progressByWorkItem[workItemId].totalNr += detail.actualQuantity?.nr || 0;
            progressByWorkItem[workItemId].totalR += detail.actualQuantity?.r || 0;
        });

        console.log(`[SPK Progress Summary] Progress by Work Item:`, progressByWorkItem);

        // Calculate total actual costs
        const totalMaterialCost = materialLogs.reduce((total, log) =>
            total + ((log.quantity || 0) * (log.unitRate || log.materialId?.unitRate || 0)), 0);

        const totalManpowerCost = manpowerLogs.reduce((total, log) =>
            total + ((log.personCount || 0) * (log.workingHours || 0) * (log.hourlyRate || 0)), 0);

        const totalEquipmentCost = equipmentLogs.reduce((total, log) => {
            const rentalRate = log.hourlyRate || 0;
            const maintenanceCost = log.maintenanceCost || 0;
            const fuelCost = (log.fuelIn || 0) * (log.fuelPrice || 0);
            return total + ((log.workingHour || 0) * rentalRate) + maintenanceCost + fuelCost;
        }, 0);

        const totalOtherCost = otherCosts.reduce((total, cost) => total + (cost.amount || 0), 0);

        const totalActualCost = totalMaterialCost + totalManpowerCost + totalEquipmentCost + totalOtherCost;

        // Calculate total sales across all activities using ActivityDetail's stored rates (primary)
        const totalSales = (activityDetails || []).reduce((sum, detail) => {
            const qtyNr = detail.actualQuantity?.nr || 0;
            const qtyR = detail.actualQuantity?.r || 0;
            const nrRate = detail.rates?.nr?.rate ?? 0;
            const rRate = detail.rates?.r?.rate ?? 0;
            return sum + (qtyNr * nrRate) + (qtyR * rRate);
        }, 0);

        // Build per-day total sales details from ActivityDetails for summary
        const activityDateById2 = new Map(
            (dailyActivities || []).map(da => [String(da._id), da.date ? da.date.toISOString() : null])
        );
        const salesByDaily2 = new Map();
        (activityDetails || []).forEach(detail => {
            const daId = String(detail.dailyActivityId || '');
            if (!daId) return;
            const qtyNr = detail.actualQuantity?.nr || 0;
            const qtyR = detail.actualQuantity?.r || 0;
            const nrRate = detail.rates?.nr?.rate ?? 0;
            const rRate = detail.rates?.r?.rate ?? 0;
            const lineTotal = (qtyNr * nrRate) + (qtyR * rRate);
            salesByDaily2.set(daId, (salesByDaily2.get(daId) || 0) + lineTotal);
        });
        const totalSalesDetails2 = Array.from(salesByDaily2.entries())
            .map(([dailyActivityId, amount]) => ({
                dailyActivityId,
                date: activityDateById2.get(dailyActivityId) || null,
                totalSales: amount
            }))
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        // Calculate SPK duration in days
        let spkDurationDays = 1; // Default to 1 day if no dates provided
        if (spk.startDate && spk.endDate) {
            const startDate = new Date(spk.startDate);
            const endDate = new Date(spk.endDate);
            spkDurationDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
        }

        console.log(`[SPK Progress Summary] SPK Duration: ${spkDurationDays} days`);

        // Calculate progress for each work item in SPK with enhanced details
        const workItemsWithProgress = spk.workItems.map(spkWorkItem => {
            const workItemData = spkWorkItem.workItemId;
            if (!workItemData) return null;

            const workItemId = workItemData._id.toString();
            const boqVolume = {
                nr: spkWorkItem.boqVolume?.nr || 0,
                r: spkWorkItem.boqVolume?.r || 0
            };

            const completedVolume = progressByWorkItem[workItemId] || { totalNr: 0, totalR: 0 };
            const completedNr = completedVolume.totalNr;
            const completedR = completedVolume.totalR;

            const remainingNr = Math.max(0, boqVolume.nr - completedNr);
            const remainingR = Math.max(0, boqVolume.r - completedR);

            // Calculate daily target
            const dailyTarget = {
                nr: boqVolume.nr / spkDurationDays,
                r: boqVolume.r / spkDurationDays
            };

            // Calculate progress percentage for individual work item
            const totalTarget = boqVolume.nr + boqVolume.r;
            const totalCompleted = completedNr + completedR;
            const progressPercentage = totalTarget > 0 ? (totalCompleted / totalTarget) * 100 : 0;

            // Calculate financial progress
            const nrRate = spkWorkItem.rates?.nr?.rate ?? 0;
            const rRate = spkWorkItem.rates?.r?.rate ?? 0;
            const totalAmount = (boqVolume.nr * nrRate) + (boqVolume.r * rRate);
            const spentAmount = (completedNr * nrRate) + (completedR * rRate);
            const remainingAmount = totalAmount - spentAmount;

            // Calculate completion status
            const isCompleted = progressPercentage >= 100;
            const isOnTrack = progressPercentage >= (totalCompleted / totalTarget) * 100;

            return {
                id: workItemData._id.toString(),
                name: workItemData.name || '',
                description: workItemData.description || '',
                category: workItemData.categoryId ? {
                    id: workItemData.categoryId._id.toString(),
                    name: workItemData.categoryId.name || ''
                } : null,
                subCategory: workItemData.subCategoryId ? {
                    id: workItemData.subCategoryId._id.toString(),
                    name: workItemData.subCategoryId.name || ''
                } : null,
                unit: workItemData.unitId ? {
                    id: workItemData.unitId._id.toString(),
                    name: workItemData.unitId.name || ''
                } : null,
                rates: {
                    nr: {
                        rate: nrRate,
                        description: spkWorkItem.rates?.nr?.description || 'Non-remote rate'
                    },
                    r: {
                        rate: rRate,
                        description: spkWorkItem.rates?.r?.description || 'Remote rate'
                    }
                },
                boqVolume: {
                    nr: boqVolume.nr,
                    r: boqVolume.r
                },
                completedVolume: {
                    nr: completedNr,
                    r: completedR
                },
                remainingVolume: {
                    nr: remainingNr,
                    r: remainingR
                },
                dailyTarget: {
                    nr: Math.ceil(dailyTarget.nr * 100) / 100,
                    r: Math.ceil(dailyTarget.r * 100) / 100
                },
                progressPercentage: Math.round(progressPercentage * 100) / 100,
                amount: totalAmount,
                spentAmount: spentAmount,
                remainingAmount: remainingAmount,
                // Enhanced progress details
                isCompleted: isCompleted,
                isOnTrack: isOnTrack,
                efficiencyRatio: totalAmount > 0 ? (spentAmount / totalAmount) * 100 : 0
            };
        }).filter(Boolean);

        // Calculate overall progress with enhanced details
        const totalTargetBOQ = spk.workItems.reduce((total, item) => {
            const nr = item.boqVolume?.nr || 0;
            const r = item.boqVolume?.r || 0;
            return total + nr + r;
        }, 0);

        const totalCompletedBOQ = Object.values(progressByWorkItem).reduce((total, progress) => {
            return total + progress.totalNr + progress.totalR;
        }, 0);

        const remainingBOQ = totalTargetBOQ - totalCompletedBOQ;
        const overallProgressPercentage = totalTargetBOQ > 0 ? (totalCompletedBOQ / totalTargetBOQ) * 100 : 0;

        // Enhanced financial progress calculations
        const totalBudget = spk.budget || 0;
        const totalPlannedCost = workItemsWithProgress.reduce((total, item) => total + item.amount, 0);
        const totalSpentFromWorkItems = workItemsWithProgress.reduce((total, item) => total + item.spentAmount, 0);
        const remainingBudget = totalBudget - totalActualCost;

        // Calculate completion statistics
        const completedWorkItems = workItemsWithProgress.filter(item => item.isCompleted).length;
        const totalWorkItems = workItemsWithProgress.length;
        const workItemCompletionPercentage = totalWorkItems > 0 ? (completedWorkItems / totalWorkItems) * 100 : 0;

        // Calculate budget utilization details
        const budgetUtilizationPercentage = totalBudget > 0 ? (totalActualCost / totalBudget) * 100 : 0;
        const plannedVsActualRatio = totalPlannedCost > 0 ? (totalActualCost / totalPlannedCost) * 100 : 0;

        // Enhanced cost breakdown
        const costBreakdown = {
            materials: {
                amount: totalMaterialCost,
                percentage: totalActualCost > 0 ? (totalMaterialCost / totalActualCost) * 100 : 0,
                count: materialLogs.length
            },
            manpower: {
                amount: totalManpowerCost,
                percentage: totalActualCost > 0 ? (totalManpowerCost / totalActualCost) * 100 : 0,
                count: manpowerLogs.length
            },
            equipment: {
                amount: totalEquipmentCost,
                percentage: totalActualCost > 0 ? (totalEquipmentCost / totalActualCost) * 100 : 0,
                count: equipmentLogs.length
            },
            others: {
                amount: totalOtherCost,
                percentage: totalActualCost > 0 ? (totalOtherCost / totalActualCost) * 100 : 0,
                count: otherCosts.length
            }
        };

        console.log(`[SPK Progress Summary] Overall Progress: ${overallProgressPercentage}%`);
        console.log(`[SPK Progress Summary] Total Target BOQ: ${totalTargetBOQ}, Completed: ${totalCompletedBOQ}`);
        console.log(`[SPK Progress Summary] Budget Utilization: ${budgetUtilizationPercentage}%`);

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
            budget: totalBudget,
            workItems: workItemsWithProgress,
            totalProgress: {
                percentage: Math.round(overallProgressPercentage * 100) / 100,
                totalTargetBOQ: totalTargetBOQ,
                totalCompletedBOQ: totalCompletedBOQ,
                remainingBOQ: remainingBOQ,
                totalBudget: totalBudget,
                totalSpent: totalActualCost,
                remainingBudget: remainingBudget,
                totalSales: totalSales,
                totalSalesDetails: totalSalesDetails2,
                workItemCompletionPercentage: workItemCompletionPercentage,
                completedWorkItems: completedWorkItems,
                totalWorkItems: totalWorkItems,
                budgetUtilizationPercentage: budgetUtilizationPercentage,
                plannedVsActualCostRatio: Math.round(plannedVsActualRatio * 100) / 100,
                totalPlannedCost: totalPlannedCost,
                isOverBudget: totalActualCost > totalBudget,
                costBreakdown: costBreakdown,
                // Additional metrics
                averageItemProgress: workItemsWithProgress.length > 0 ?
                    workItemsWithProgress.reduce((sum, item) => sum + item.progressPercentage, 0) / workItemsWithProgress.length : 0,
                onTrackItems: workItemsWithProgress.filter(item => item.isOnTrack).length,
                projectDuration: spkDurationDays,
                remainingDays: spk.endDate ? Math.max(0, Math.ceil((new Date(spk.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0
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
            item => item.workItemId && item.workItemId.toString() === workItemId
        );

        if (workItemIndex === -1) {
            throw new Error('WorkItem not found in this SPK');
        }

        // Simpan referensi ke objek yang akan diupdate
        const currentItem = spk.workItems[workItemIndex];
        
        // Simpan workItemId asli
        const originalWorkItemId = currentItem.workItemId;
        
        // Update field individual saja, bukan seluruh objek
        if (input.boqVolume) currentItem.boqVolume = input.boqVolume;
        if (input.rates) currentItem.rates = input.rates;
        if (input.description !== undefined) currentItem.description = input.description;
        
        // Hitung ulang amount jika perlu
        if (input.boqVolume || input.rates) {
            const boqVolume = currentItem.boqVolume;
            const rates = currentItem.rates;
            
            if (boqVolume && rates && rates.nr && rates.r) {
                currentItem.amount = (boqVolume.nr * rates.nr.rate) +
                    (boqVolume.r * rates.r.rate);
            }
        }
        
        // Pastikan workItemId tidak hilang
        currentItem.workItemId = originalWorkItemId;
        
        // Debug
        console.log('Updating SPK workItem:', {
            spkId,
            workItemIndex,
            workItemId: currentItem.workItemId,
            hasWorkItemId: !!currentItem.workItemId
        });

        await spk.save();
        return spk;
    },
    
    updateSpkStatus: async (_, { id, status }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        
        // Validasi status yang diberikan (pastikan sesuai dengan nilai enum yang diizinkan)
        const validStatuses = ['draft', 'active', 'completed', 'cancelled', 'closed'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Status tidak valid. Status harus salah satu dari: ${validStatuses.join(', ')}`);
        }
        
        // Temukan SPK berdasarkan ID
        const spk = await SPK.findById(id);
        if (!spk) throw new Error('SPK tidak ditemukan');
        
        // Update status
        spk.status = status;
        
        // Simpan perubahan
        await spk.save();
        
        console.log(`Status SPK ${id} berhasil diubah ke '${status}'`);
        return spk;
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