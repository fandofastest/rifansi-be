const {
  User,
  Category,
  SubCategory,
  Unit,
  Material,
  Equipment,
  PersonnelRole,
  FuelPrice,
  SPK,
  WorkItem,
  DailyActivity,
  ActivityDetail,
  ProgressLog,
  EquipmentLog,
  ManpowerLog,
  Contract,
  Area,
  MaterialUsageLog,
  OtherCost
} = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const resolvers = {
  Query: {
    // User Queries
    me: async (_, __, { user }) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      // Find the user by ID to ensure we have the complete user object
      const currentUser = await User.findById(user.userId);
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      return currentUser;
    },
    users: async (_, __, { user }) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      
      // Find all users and ensure required fields are present
      const users = await User.find();
      
      // Filter out any users that don't have required fields
      const validUsers = users.filter(user => 
        user.username && 
        user.fullName && 
        user.role && 
        user.email
      );
      
      return validUsers;
    },
    user: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return User.findById(id);
    },

    // Contract Queries
    contracts: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Contract.find();
    },
    contract: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Contract.findById(id);
    },

    // Category Queries
    categories: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Category.find();
    },
    category: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Category.findById(id);
    },

    // SubCategory Queries
    subCategories: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return SubCategory.find();
    },
    subCategory: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return SubCategory.findById(id);
    },
    subCategoriesByCategory: async (_, { categoryId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return SubCategory.find({ categoryId });
    },

    // Unit Queries
    units: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Unit.find();
    },
    unit: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Unit.findById(id);
    },

    // Material Queries
    materials: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Material.find().populate('unitId');
    },
    material: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Material.findById(id).populate('unitId');
    },

    // Equipment Queries
    equipments: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Equipment.find();
    },
    equipment: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Equipment.findById(id);
    },
    equipmentsByStatus: async (_, { status }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Equipment.find({ serviceStatus: status });
    },

    // PersonnelRole Queries
    personnelRoles: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return PersonnelRole.find();
    },
    personnelRole: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return PersonnelRole.findById(id);
    },

    // FuelPrice Queries
    fuelPrices: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return FuelPrice.find();
    },
    fuelPrice: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return FuelPrice.findById(id);
    },
    currentFuelPrice: async (_, { fuelType }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return FuelPrice.findOne({ fuelType })
        .sort({ effectiveDate: -1 })
        .limit(1);
    },

    // SPK Queries
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
          rates: item.rates || { nr: { rate: 0, description: '' }, r: { rate: 0, description: '' } },
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
          rates: item.rates || { nr: { rate: 0, description: '' }, r: { rate: 0, description: '' } },
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

    // WorkItem Queries
    workItems: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return WorkItem.find()
        .populate('categoryId')
        .populate('subCategoryId')
        .populate('unitId');
    },
    workItem: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return WorkItem.findById(id)
        .populate('categoryId')
        .populate('subCategoryId')
        .populate('unitId');
    },
    workItemsBySPK: async (_, { spkId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return WorkItem.find({ spkId })
        .populate('spkId')
        .populate('categoryId')
        .populate('subCategoryId')
        .populate('unitId');
    },

    // DailyActivity Queries
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

    // ActivityDetail Queries
    activityDetails: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return ActivityDetail.find()
        .populate('dailyActivityId')
        .populate('workItemId');
    },
    activityDetail: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return ActivityDetail.findById(id)
        .populate('dailyActivityId')
        .populate('workItemId');
    },
    activityDetailsByDailyActivity: async (_, { dailyActivityId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return ActivityDetail.find({ dailyActivityId })
        .populate('dailyActivityId')
        .populate('workItemId');
    },

    // EquipmentLog Queries
    equipmentLogs: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return EquipmentLog.find()
        .populate('dailyActivityId')
        .populate('equipmentId');
    },
    equipmentLog: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return EquipmentLog.findById(id)
        .populate('dailyActivityId')
        .populate('equipmentId');
    },
    equipmentLogsByDailyActivity: async (_, { dailyActivityId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return EquipmentLog.find({ dailyActivityId })
        .populate('dailyActivityId')
        .populate('equipmentId');
    },

    // ManpowerLog Queries
    manpowerLogs: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return ManpowerLog.find()
        .populate('dailyActivityId')
        .populate('role');
    },
    manpowerLog: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return ManpowerLog.findById(id)
        .populate('dailyActivityId')
        .populate('role');
    },
    manpowerLogsByDailyActivity: async (_, { dailyActivityId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return ManpowerLog.find({ dailyActivityId })
        .populate('dailyActivityId')
        .populate('role');
    },

    // Area Queries
    areas: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Area.find().sort({ name: 1 });
    },
    area: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Area.findById(id);
    },
    areasNearby: async (_, { latitude, longitude, maxDistance }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Area.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance
          }
        }
      });
    },

    // MaterialUsageLog Queries
    materialUsageLogs: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return MaterialUsageLog.find()
        .populate('dailyActivityId')
        .populate('materialId');
    },
    materialUsageLog: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return MaterialUsageLog.findById(id)
        .populate('dailyActivityId')
        .populate('materialId');
    },
    materialUsageLogsByDailyActivity: async (_, { dailyActivityId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return MaterialUsageLog.find({ dailyActivityId })
        .populate('dailyActivityId')
        .populate('materialId');
    },

    spkProgress: async (_, { spkId, startDate, endDate }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const dailyActivities = await DailyActivity.find({
        spkId,
        date: { $gte: startDate, $lte: endDate },
        isActive: true
      })
      .populate({
        path: 'activityDetails',
        populate: { path: 'workItemId' }
      })
      .populate('equipmentLogs')
      .populate('manpowerLogs')
      .populate('materialUsageLogs');

      // Hitung progress fisik
      const physicalProgress = calculatePhysicalProgress(dailyActivities);
      
      // Hitung progress finansial
      const financialProgress = calculateFinancialProgress(dailyActivities);
      
      // Hitung biaya
      const costs = calculateCosts(dailyActivities);

      // Hitung progress per work item
      const workItemsProgress = calculateWorkItemsProgress(dailyActivities);

      return {
        physicalProgress,
        financialProgress,
        costs,
        workItemsProgress,
        dailyActivities
      };
    },

    dailyProgress: async (_, { spkId, date }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const dailyActivity = await DailyActivity.findOne({
        spkId,
        date,
        isActive: true
      })
      .populate({
        path: 'activityDetails',
        populate: { path: 'workItemId' }
      })
      .populate('equipmentLogs')
      .populate('manpowerLogs')
      .populate('materialUsageLogs');

      if (!dailyActivity) return null;

      return {
        date: dailyActivity.date,
        progress: {
          physical: calculateDailyPhysicalProgress(dailyActivity.activityDetails),
          financial: calculateDailyFinancialProgress(dailyActivity.equipmentLogs, dailyActivity.manpowerLogs, dailyActivity.materialUsageLogs)
        },
        costs: calculateDailyCosts(dailyActivity.equipmentLogs, dailyActivity.manpowerLogs, dailyActivity.materialUsageLogs)
      };
    },

    weeklyProgress: async (_, { spkId, week, year }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const { startDate, endDate } = getWeekDates(week, year);
      
      const dailyActivities = await DailyActivity.find({
        spkId,
        date: { $gte: startDate, $lte: endDate },
        isActive: true
      })
      .populate({
        path: 'activityDetails',
        populate: { path: 'workItemId' }
      })
      .populate('equipmentLogs')
      .populate('manpowerLogs')
      .populate('materialUsageLogs');

      return {
        week,
        year,
        progress: {
          physical: calculatePhysicalProgress(dailyActivities),
          financial: calculateFinancialProgress(dailyActivities)
        },
        costs: calculateCosts(dailyActivities)
      };
    },

    monthlyProgress: async (_, { spkId, month, year }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const { startDate, endDate } = getMonthDates(month, year);
      
      const dailyActivities = await DailyActivity.find({
        spkId,
        date: { $gte: startDate, $lte: endDate },
        isActive: true
      })
      .populate({
        path: 'activityDetails',
        populate: { path: 'workItemId' }
      })
      .populate('equipmentLogs')
      .populate('manpowerLogs')
      .populate('materialUsageLogs');

      return {
        month,
        year,
        progress: {
          physical: calculatePhysicalProgress(dailyActivities),
          financial: calculateFinancialProgress(dailyActivities)
        },
        costs: calculateCosts(dailyActivities)
      };
    },

    // SPK with Progress
    getSpkWithProgress: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      try {
        // Ambil data SPK
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

        if (!spk) throw new Error(`SPK with ID ${id} not found`);

        // Ambil semua aktivitas harian untuk SPK ini
        const dailyActivities = await DailyActivity.find({
          spkId: id,
          isActive: true
        }).sort({ date: -1 });

        // Ambil semua detail aktivitas untuk SPK ini
        const activityDetails = await ActivityDetail.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) },
          isActive: true
        });

        // Map untuk menyimpan actual volume setiap work item
        const workItemActualVolumes = new Map();

        // Hitung actual volume untuk setiap work item
        activityDetails.forEach(detail => {
          const workItemId = detail.workItemId.toString();
          if (!workItemActualVolumes.has(workItemId)) {
            workItemActualVolumes.set(workItemId, { nr: 0, r: 0 });
          }
          const actualVolume = workItemActualVolumes.get(workItemId);
          actualVolume.nr += detail.actualQuantity.nr || 0;
          actualVolume.r += detail.actualQuantity.r || 0;
        });

        // Hitung total BOQ dan total actual volume
        let totalBoqVolume = 0;
        let totalActualVolume = 0;

        // Siapkan work items dengan progress
        const workItemsWithProgress = spk.workItems.map(item => {
          const actualVolume = workItemActualVolumes.get(item.workItemId.toString()) || { nr: 0, r: 0 };
          const totalItemBoq = item.boqVolume.nr + item.boqVolume.r;
          const totalItemActual = actualVolume.nr + actualVolume.r;
          const progressPercentage = totalItemBoq > 0 ? (totalItemActual / totalItemBoq) * 100 : 0;
          
          totalBoqVolume += totalItemBoq;
          totalActualVolume += totalItemActual;

          return {
            workItemId: item.workItemId._id || item.workItemId,
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
            } : null,
            boqVolume: item.boqVolume,
            actualVolume,
            progressPercentage,
            amount: item.amount,
            rates: item.rates,
            description: item.description
          };
        });

        // Hitung overall progress
        const overallProgress = totalBoqVolume > 0 ? (totalActualVolume / totalBoqVolume) * 100 : 0;

        // Hitung financial progress
        const totalEarnedAmount = workItemsWithProgress.reduce((sum, item) => {
          const earnedAmount = (item.progressPercentage / 100) * item.amount;
          return sum + earnedAmount;
        }, 0);
        const financialProgress = spk.budget > 0 ? (totalEarnedAmount / spk.budget) * 100 : 0;

        // Ambil equipment logs, manpower logs, dan material usage logs untuk menghitung costs
        const equipmentLogs = await EquipmentLog.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) },
          isActive: true
        });
        const manpowerLogs = await ManpowerLog.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        });
        const materialUsageLogs = await MaterialUsageLog.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        });
        const otherCosts = await OtherCost.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) },
          isActive: true
        });

        // Hitung costs
        const projectCosts = {
          equipment: equipmentLogs.reduce((sum, log) => sum + (log.fuelIn * (log.fuelPrice || 0)), 0),
          manpower: manpowerLogs.reduce((sum, log) => sum + (log.personCount * (log.normalHoursPerPerson || 0) * log.normalHourlyRate), 0),
          material: materialUsageLogs.reduce((sum, log) => sum + ((log.quantity || 0) * (log.unitRate || 0)), 0),
          other: otherCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0)
        };
        projectCosts.total = projectCosts.equipment + projectCosts.manpower + projectCosts.material + projectCosts.other;

        // Siapkan daily activity dengan semua detailnya
        const dailyActivitiesWithDetails = await Promise.all(
          dailyActivities.map(async (da) => {
            // Ambil detail aktivitas untuk day ini
            const activityDetailsForDay = activityDetails.filter(
              detail => detail.dailyActivityId.toString() === da._id.toString()
            );
            
            // Ambil equipment logs untuk day ini
            const equipmentLogsForDay = equipmentLogs.filter(
              log => log.dailyActivityId.toString() === da._id.toString()
            );
            
            // Ambil manpower logs untuk day ini
            const manpowerLogsForDay = manpowerLogs.filter(
              log => log.dailyActivityId.toString() === da._id.toString()
            );
            
            // Ambil material usage logs untuk day ini
            const materialUsageLogsForDay = materialUsageLogs.filter(
              log => log.dailyActivityId.toString() === da._id.toString()
            );
            
            // Ambil other costs untuk day ini
            const otherCostsForDay = otherCosts.filter(
              cost => cost.dailyActivityId.toString() === da._id.toString()
            );
            
            // Hitung progress percentage untuk aktivitas harian ini
            let dailyProgressPercentage = 0;
            if (activityDetailsForDay.length > 0) {
              const dailyActualVolume = activityDetailsForDay.reduce((sum, detail) => {
                return sum + (detail.actualQuantity.nr + detail.actualQuantity.r);
              }, 0);
              
              // Hitung daily target berdasarkan total BOQ dan total hari kerja
              const startDate = new Date(parseInt(spk.startDate));
              const endDate = new Date(parseInt(spk.endDate));
              const totalWorkDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
              const dailyTarget = totalBoqVolume / totalWorkDays;
              
              dailyProgressPercentage = dailyTarget > 0 ? (dailyActualVolume / dailyTarget) * 100 : 0;
            }
            
            // Menyiapkan detail lengkap aktivitas harian
            return {
              id: da._id,
              date: da.date,
              location: da.location,
              weather: da.weather,
              status: da.status,
              workStartTime: da.workStartTime,
              workEndTime: da.workEndTime,
              closingRemarks: da.closingRemarks,
              progressPercentage: dailyProgressPercentage,
              activityDetails: activityDetailsForDay.map(detail => {
                // Ambil dan hitung progressPercentage jika belum ada
                let detailProgressPercentage = detail.progressPercentage;
                if (detailProgressPercentage === undefined) {
                  // Cari work item yang sesuai
                  const workItem = spk.workItems.find(item => 
                    item.workItemId.toString() === detail.workItemId.toString()
                  );
                  if (workItem) {
                    const boqVolume = workItem.boqVolume.nr + workItem.boqVolume.r;
                    const actualVolume = detail.actualQuantity.nr + detail.actualQuantity.r;
                    detailProgressPercentage = boqVolume > 0 ? (actualVolume / boqVolume) * 100 : 0;
                  } else {
                    detailProgressPercentage = 0;
                  }
                }
                
                return {
                  id: detail._id,
                  dailyActivityId: detail.dailyActivityId,
                  workItemId: detail.workItemId,
                  actualQuantity: detail.actualQuantity,
                  status: detail.status,
                  remarks: detail.remarks,
                  progressPercentage: detailProgressPercentage
                };
              }),
              equipmentLogs: equipmentLogsForDay.map(log => ({
                id: log._id,
                dailyActivityId: log.dailyActivityId,
                equipmentId: log.equipmentId,
                fuelIn: log.fuelIn,
                fuelRemaining: log.fuelRemaining,
                workingHour: log.workingHour,
                isBrokenReported: log.isBrokenReported,
                remarks: log.remarks
              })),
              manpowerLogs: manpowerLogsForDay.map(log => ({
                id: log._id,
                dailyActivityId: log.dailyActivityId,
                role: log.role,
                personCount: log.personCount,
                normalHoursPerPerson: log.normalHoursPerPerson,
                normalHourlyRate: log.normalHourlyRate,
                overtimeHourlyRate: log.overtimeHourlyRate
              })),
              materialUsageLogs: materialUsageLogsForDay.map(log => ({
                id: log._id,
                dailyActivityId: log.dailyActivityId,
                materialId: log.materialId,
                quantity: log.quantity,
                unitRate: log.unitRate,
                remarks: log.remarks
              })),
              otherCosts: otherCostsForDay.map(cost => ({
                id: cost._id,
                dailyActivityId: cost.dailyActivityId,
                costType: cost.costType,
                amount: cost.amount,
                description: cost.description,
                receiptNumber: cost.receiptNumber,
                remarks: cost.remarks
              })),
              createdAt: da.createdAt,
              updatedAt: da.updatedAt
            };
          })
        );

        return {
          id: spk._id,
          spkNo: spk.spkNo,
          wapNo: spk.wapNo,
          title: spk.title,
          projectName: spk.projectName,
          date: spk.date,
          contractor: spk.contractor,
          workDescription: spk.workDescription,
          location: spk.location ? {
            id: spk.location._id,
            name: spk.location.name
          } : null,
          startDate: spk.startDate,
          endDate: spk.endDate,
          budget: spk.budget,
          workItems: workItemsWithProgress,
          overallProgress,
          financialProgress,
          costs: projectCosts,
          dailyActivities: dailyActivitiesWithDetails,
          createdAt: spk.createdAt,
          updatedAt: spk.updatedAt
        };
      } catch (error) {
        console.error('Error in getSpkWithProgress:', error);
        throw error;
      }
    },

    // OtherCost Queries
    otherCosts: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return OtherCost.find().populate('dailyActivityId');
    },
    otherCost: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return OtherCost.findById(id).populate('dailyActivityId');
    },
    otherCostsByDailyActivity: async (_, { dailyActivityId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return OtherCost.find({ dailyActivityId }).populate('dailyActivityId');
    },
    otherCostsByCostType: async (_, { costType }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return OtherCost.find({ costType }).populate('dailyActivityId');
    },
  },

  Mutation: {
    // Auth Mutations
    register: async (_, { username, password, fullName, role, email, phone }) => {
      try {
        // Find the role by roleCode
        const personnelRole = await PersonnelRole.findOne({ roleCode: role });
        if (!personnelRole) {
          throw new Error(`Role with code ${role} not found`);
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
          throw new Error('Username already exists');
        }

        const user = new User({
          username,
          passwordHash: password,
          fullName,
          role: personnelRole._id,
          email,
          phone
        });

        await user.save();

        // Populate role for response
        await user.populate('role');

        const token = jwt.sign(
          { userId: user.id, roleCode: personnelRole.roleCode },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );

        return {
          token,
          user
        };
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },

    login: async (_, { username, password }) => {
      try {
        const user = await User.findOne({ username });
        if (!user) {
          throw new Error('Invalid credentials');
        }

        if (!user.passwordHash) {
          throw new Error('User password not set');
        }

        const valid = await user.comparePassword(password);
        if (!valid) {
          throw new Error('Invalid credentials');
        }

        // Handle legacy role (string) if needed
        if (typeof user.role === 'string') {
          // Map legacy role to new roleCode
          const roleMapping = {
            'superadmin': 'SUPERADMIN',
            'admin': 'ADMIN',
            'mandor': 'MANDOR',
            'supervisor': 'SUPERVISOR',
            'user': 'USER'
          };

          const roleCode = roleMapping[user.role.toLowerCase()] || 'USER';
          
          // Find corresponding role
          const personnelRole = await PersonnelRole.findOne({ roleCode });
          if (personnelRole) {
            // Update user with new role reference
            user.role = personnelRole._id;
            await user.save();
            console.log(`User ${username} role migrated from string to ObjectId`);
          } else {
            console.error(`Role ${roleCode} not found for user ${username}`);
            throw new Error('User role configuration error');
          }
        }

        // Populate role after potential migration and ensure it exists
        await user.populate('role');
        
        // If role is not populated or has missing fields, try to fix it
        if (!user.role || !user.role.roleCode) {
          // Find default USER role
          const defaultRole = await PersonnelRole.findOne({ roleCode: 'USER' });
          if (defaultRole) {
            user.role = defaultRole._id;
            await user.save();
            await user.populate('role');
          } else {
            console.error(`Default USER role not found for user ${username}`);
          }
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Double check that role is properly populated
        if (!user.role || typeof user.role !== 'object' || !user.role.roleCode) {
          console.error(`Role still not properly populated for user ${username}:`, user.role);
          
          // Create a mock role for response
          const mockRole = {
            _id: "default",
            roleCode: "USER",
            roleName: "Regular User",
            hourlyRate: 0,
            description: "Default role"
          };
          
          // Attach the mock role to user for response
          user.role = mockRole;
        }

        const token = jwt.sign(
          { userId: user.id, roleCode: user.role.roleCode },
          process.env.JWT_SECRET,
          { expiresIn: '1d' }
        );

        return {
          token,
          user
        };
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    updateUser: async (_, { id, username, password, fullName, role, email, phone }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Find the user first
      const existingUser = await User.findById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Prepare update data
      const updateData = {};
      if (username) updateData.username = username;
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      
      // If role is being updated, find the role object
      if (role) {
        const personnelRole = await PersonnelRole.findOne({ roleCode: role });
        if (!personnelRole) {
          throw new Error(`Role ${role} not found`);
        }
        updateData.role = personnelRole._id;
      }
      
      // Handle password update separately
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(password, salt);
      }

      // Update the user
      const updatedUser = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('role');

      if (!updatedUser) {
        throw new Error('Failed to update user');
      }

      return updatedUser;
    },

    deleteUser: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await User.findByIdAndDelete(id);
      return true;
    },

    // Contract Mutations
    createContract: async (_, { contractNo, description, startDate, endDate, vendorName }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const contract = new Contract({ contractNo, description, startDate, endDate, vendorName });
      return contract.save();
    },

    updateContract: async (_, { id, contractNo, description, startDate, endDate, vendorName }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const updateData = { contractNo, description, startDate, endDate, vendorName };
      // Hapus field undefined
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
      return await Contract.findByIdAndUpdate(id, updateData, { new: true });
    },

    deleteContract: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await Contract.findByIdAndDelete(id);
      return true;
    },

    // Category Mutations
    createCategory: async (_, { code, name, description }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const category = new Category({ code, name, description });
      return category.save();
    },
    updateCategory: async (_, { id, code, name, description }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Category.findByIdAndUpdate(
        id,
        { code, name, description },
        { new: true }
      );
    },
    deleteCategory: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await Category.findByIdAndDelete(id);
      return true;
    },

    // SubCategory Mutations
    createSubCategory: async (_, { categoryId, name, description }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const subCategory = new SubCategory({ categoryId, name, description });
      return subCategory.save();
    },
    updateSubCategory: async (_, { id, categoryId, name, description }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return SubCategory.findByIdAndUpdate(
        id,
        { categoryId, name, description },
        { new: true }
      );
    },
    deleteSubCategory: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await SubCategory.findByIdAndDelete(id);
      return true;
    },

    // Unit Mutations
    createUnit: async (_, { code, name, description }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const unit = new Unit({ code, name, description });
      return unit.save();
    },
    updateUnit: async (_, { id, code, name, description }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Unit.findByIdAndUpdate(
        id,
        { code, name, description },
        { new: true }
      );
    },
    deleteUnit: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await Unit.findByIdAndDelete(id);
      return true;
    },

    // Material Mutations
    createMaterial: async (_, { name, unitId, unitRate, description }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const material = new Material({ name, unitId, unitRate, description });
      return material.save();
    },
    updateMaterial: async (_, { id, name, unitId, unitRate, description }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Material.findByIdAndUpdate(
        id,
        { name, unitId, unitRate, description },
        { new: true }
      );
    },
    deleteMaterial: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await Material.findByIdAndDelete(id);
      return true;
    },

    // Equipment Mutations
    createEquipment: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const equipment = new Equipment(args);
      return equipment.save();
    },
    updateEquipment: async (_, { id, ...args }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return Equipment.findByIdAndUpdate(id, args, { new: true });
    },
    deleteEquipment: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await Equipment.findByIdAndDelete(id);
      return true;
    },

    // PersonnelRole Mutations
    createPersonnelRole: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const personnelRole = new PersonnelRole(args);
      return personnelRole.save();
    },
    updatePersonnelRole: async (_, { id, ...args }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return PersonnelRole.findByIdAndUpdate(id, args, { new: true });
    },
    deletePersonnelRole: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await PersonnelRole.findByIdAndDelete(id);
      return true;
    },

    // FuelPrice Mutations
    createFuelPrice: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const fuelPrice = new FuelPrice(args);
      return fuelPrice.save();
    },
    updateFuelPrice: async (_, { id, ...args }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return FuelPrice.findByIdAndUpdate(id, args, { new: true });
    },
    deleteFuelPrice: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await FuelPrice.findByIdAndDelete(id);
      return true;
    },

    // SPK Mutations
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
      
      // Check if work item already exists in SPK
      const existingWorkItem = spk.workItems.find(
        item => item.workItemId.toString() === input.workItemId
      );
      
      if (existingWorkItem) {
        throw new Error('WorkItem already exists in this SPK');
      }
      
      // Calculate amount based on both remote and non-remote volumes and rates
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
      
      // If boqVolume or rates are being updated, recalculate amount
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
    },

    // WorkItem Mutations
    createWorkItem: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Validate rates structure
      if (!input.rates || !input.rates.nr || !input.rates.r) {
        throw new Error('Both non-remote (nr) and remote (r) rates are required');
      }

      if (!input.rates.nr.rate || !input.rates.r.rate) {
        throw new Error('Rate values are required for both non-remote and remote rates');
      }
      
      const workItem = new WorkItem({
        ...input,
        rates: {
          nr: {
            rate: input.rates.nr.rate,
            description: input.rates.nr.description || 'Non-remote rate'
          },
          r: {
            rate: input.rates.r.rate,
            description: input.rates.r.description || 'Remote rate'
          }
        }
      });

      return workItem.save();
    },

    updateWorkItem: async (_, { id, input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const updateData = { ...input };

      // If rates are being updated, validate the structure
      if (input.rates) {
        if (!input.rates.nr || !input.rates.r) {
          throw new Error('Both non-remote (nr) and remote (r) rates are required');
        }

        if (!input.rates.nr.rate || !input.rates.r.rate) {
          throw new Error('Rate values are required for both non-remote and remote rates');
        }

        updateData.rates = {
          nr: {
            rate: input.rates.nr.rate,
            description: input.rates.nr.description || 'Non-remote rate'
          },
          r: {
            rate: input.rates.r.rate,
            description: input.rates.r.description || 'Remote rate'
          }
        };
      }
      
      return WorkItem.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );
    },

    deleteWorkItem: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Check if work item is used in any SPK
      const spks = await SPK.find({ 'workItems.workItemId': id });
      if (spks.length > 0) {
        throw new Error('Cannot delete work item that is used in SPKs');
      }
      
      const result = await WorkItem.findByIdAndDelete(id);
      return !!result;
    },

    // DailyActivity Mutations
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

    // ActivityDetail Mutations
    createActivityDetail: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const activityDetail = new ActivityDetail(args);
      return activityDetail.save();
    },
    updateActivityDetail: async (_, { id, ...args }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return ActivityDetail.findByIdAndUpdate(id, args, { new: true });
    },
    deleteActivityDetail: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await ActivityDetail.findByIdAndDelete(id);
      return true;
    },

    // EquipmentLog Mutations
    createEquipmentLog: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const equipmentLog = new EquipmentLog(args);
      return equipmentLog.save();
    },
    updateEquipmentLog: async (_, { id, ...args }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return EquipmentLog.findByIdAndUpdate(id, args, { new: true });
    },
    deleteEquipmentLog: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await EquipmentLog.findByIdAndDelete(id);
      return true;
    },

    // ManpowerLog Mutations
    createManpowerLog: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const manpowerLog = new ManpowerLog(args);
      return manpowerLog.save();
    },
    updateManpowerLog: async (_, { id, ...args }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return ManpowerLog.findByIdAndUpdate(id, args, { new: true });
    },
    deleteManpowerLog: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await ManpowerLog.findByIdAndDelete(id);
      return true;
    },

    // Area Mutations
    createArea: async (_, { name, latitude, longitude }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const area = new Area({
        name,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      });
      
      return area.save();
    },
    updateArea: async (_, { id, name, latitude, longitude }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const updateData = {};
      if (name) updateData.name = name;
      if (latitude !== undefined && longitude !== undefined) {
        updateData.location = {
          type: 'Point',
          coordinates: [longitude, latitude]
        };
      }
      
      return Area.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
    },
    deleteArea: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await Area.findByIdAndDelete(id);
      return true;
    },

    // Equipment-Contract Relationship Mutations
    addContractToEquipment: async (_, { equipmentId, contract }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const equipment = await Equipment.findById(equipmentId);
      if (!equipment) throw new Error('Equipment not found');
      
      // Check if contract exists
      const contractExists = await Contract.findById(contract.contractId);
      if (!contractExists) throw new Error('Contract not found');
      
      // Check if contract is already attached
      const contractAlreadyAttached = equipment.contracts && equipment.contracts.some(
        c => c.contractId.toString() === contract.contractId
      );
      
      if (contractAlreadyAttached) {
        throw new Error('Contract already attached to this equipment');
      }
      
      // Initialize contracts array if it doesn't exist
      if (!equipment.contracts) {
        equipment.contracts = [];
      }
      
      equipment.contracts.push(contract);
      await equipment.save();
      
      return equipment;
    },
    
    updateEquipmentContract: async (_, { equipmentId, contractId, rentalRate }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const equipment = await Equipment.findById(equipmentId);
      if (!equipment) throw new Error('Equipment not found');
      
      if (!equipment.contracts || !equipment.contracts.length) {
        throw new Error('This equipment has no contracts');
      }
      
      const contractIndex = equipment.contracts.findIndex(
        c => c.contractId.toString() === contractId
      );
      
      if (contractIndex === -1) {
        throw new Error('Contract not found in this equipment');
      }
      
      equipment.contracts[contractIndex].rentalRate = rentalRate;
      await equipment.save();
      
      return equipment;
    },
    
    removeContractFromEquipment: async (_, { equipmentId, contractId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const equipment = await Equipment.findById(equipmentId);
      if (!equipment) throw new Error('Equipment not found');
      
      if (!equipment.contracts || !equipment.contracts.length) {
        throw new Error('This equipment has no contracts');
      }
      
      equipment.contracts = equipment.contracts.filter(
        c => c.contractId.toString() !== contractId
      );
      
      await equipment.save();
      
      return equipment;
    },

    // User self-management
    updateMyProfile: async (_, { fullName, email, phone }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const updateData = {};
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      
      const updatedUser = await User.findByIdAndUpdate(
        user.userId,
        updateData,
        { new: true, runValidators: true }
      ).populate('role');
      
      if (!updatedUser) {
        throw new Error('Failed to update profile');
      }
      
      return updatedUser;
    },
    
    changeMyPassword: async (_, { currentPassword, newPassword }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const currentUser = await User.findById(user.userId);
      if (!currentUser) {
        throw new Error('User not found');
      }
      
      // Check current password
      const isMatch = await currentUser.comparePassword(currentPassword);
      if (!isMatch) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }
      
      // Update password
      currentUser.passwordHash = newPassword;
      await currentUser.save();
      
      return {
        success: true,
        message: 'Password changed successfully'
      };
    },

    // MaterialUsageLog Mutations
    createMaterialUsageLog: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const materialUsageLog = new MaterialUsageLog(args);
      return materialUsageLog.save();
    },
    updateMaterialUsageLog: async (_, { id, ...args }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return MaterialUsageLog.findByIdAndUpdate(id, args, { new: true });
    },
    deleteMaterialUsageLog: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await MaterialUsageLog.findByIdAndDelete(id);
      return true;
    },

    // OtherCost Mutations
    createOtherCost: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const otherCost = new OtherCost({
        ...args,
        createdBy: user.userId,
        lastUpdatedBy: user.userId
      });
      return otherCost.save();
    },
    updateOtherCost: async (_, { id, ...args }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const updateData = { ...args, lastUpdatedBy: user.userId };
      return OtherCost.findByIdAndUpdate(id, updateData, { new: true });
    },
    deleteOtherCost: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await OtherCost.findByIdAndDelete(id);
      return true;
    },

    submitDailyReport: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      try {
        // Ambil data SPK untuk perhitungan progressPercentage
        const spk = await SPK.findById(input.spkId);
        if (!spk) {
          throw new Error(`SPK with ID ${input.spkId} not found`);
        }

        // 1. Create DailyActivity
        const dailyActivity = new DailyActivity({
          spkId: input.spkId,
          date: input.date,
          location: input.location,
          weather: input.weather,
          status: 'Submitted',
          workStartTime: input.workStartTime,
          workEndTime: input.workEndTime,
          createdBy: user.userId,
          closingRemarks: input.closingRemarks,
          isActive: true
        });

        await dailyActivity.save();

        // 2. Create ActivityDetails
        const activityDetails = await Promise.all(
          input.activityDetails.map(async (detail) => {
            // Cari data workItem untuk mendapatkan boqVolume
            const workItem = spk.workItems.find(item => 
              item.workItemId.toString() === detail.workItemId.toString()
            );
            
            // Hitung progressPercentage untuk item ini
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

        // 3. Create EquipmentLogs
        const equipmentLogs = await Promise.all(
          input.equipmentLogs.map(async (log) => {
            const prevLog = await EquipmentLog.findOne({
              equipmentId: log.equipmentId
            }).sort({ createdAt: -1 });
            const prevFuelRemaining = prevLog ? prevLog.fuelRemaining : 0;
            const equipment = await Equipment.findById(log.equipmentId);
            let fuelPrice = 0;
            if (equipment && equipment.fuelType) {
              const fuelPriceDoc = await FuelPrice.findOne({ fuelType: equipment.fuelType }).sort({ effectiveDate: -1 });
              fuelPrice = fuelPriceDoc ? fuelPriceDoc.pricePerLiter : 0;
            }
            const equipmentLog = new EquipmentLog({
              dailyActivityId: dailyActivity._id,
              equipmentId: log.equipmentId,
              fuelIn: log.fuelIn,
              fuelRemaining: log.fuelRemaining,
              workingHour: log.workingHour,
              fuelPrice: fuelPrice,
              isBrokenReported: log.isBrokenReported || false,
              brokenDescription: log.brokenDescription,
              remarks: log.remarks,
              createdBy: user.userId,
              lastUpdatedBy: user.userId
            });
            return equipmentLog.save();
          })
        );

        // 4. Create ManpowerLogs
        const manpowerLogs = await Promise.all(
          input.manpowerLogs.map(async (log) => {
            const manpowerLog = new ManpowerLog({
              dailyActivityId: dailyActivity._id,
              role: log.role,
              personCount: log.personCount,
              normalHoursPerPerson: log.normalHoursPerPerson,
              normalHourlyRate: log.normalHourlyRate,
              overtimeHourlyRate: log.overtimeHourlyRate,
              createdBy: user.userId
            });
            return manpowerLog.save();
          })
        );

        // 5. Create MaterialUsageLogs
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

        // 6. Create OtherCosts
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

        // Calculate progress and costs
        const progress = {
          physical: calculateDailyPhysicalProgress(activityDetails),
          financial: calculateDailyFinancialProgress(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts)
        };

        const costs = calculateDailyCosts(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts);
        
        // Calculate overall progress percentage
        const overallProgressPercentage = calculateProgressPercentage(activityDetails, spk);

        return {
          id: dailyActivity._id,
          date: dailyActivity.date,
          status: dailyActivity.status,
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
            isBrokenReported: log.isBrokenReported,
            remarks: log.remarks,
            equipment: null // Akan di-resolve di resolver type
          })),
          manpowerLogs: manpowerLogs.map(log => ({
            id: log._id,
            dailyActivityId: log.dailyActivityId,
            role: log.role,
            personCount: log.personCount,
            normalHoursPerPerson: log.normalHoursPerPerson,
            normalHourlyRate: log.normalHourlyRate,
            overtimeHourlyRate: log.overtimeHourlyRate,
            personnelRole: null // Akan di-resolve di resolver type
          })),
          materialUsageLogs: materialUsageLogs.map(log => ({
            id: log._id,
            dailyActivityId: log.dailyActivityId,
            materialId: log.materialId,
            quantity: log.quantity,
            unitRate: log.unitRate,
            remarks: log.remarks,
            material: null // Akan di-resolve di resolver type
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
  },

  // Type Resolvers
  Category: {
    subCategories: async (parent) => {
      return SubCategory.find({ categoryId: parent.id });
    }
  },

  SubCategory: {
    category: async (parent) => {
      return Category.findById(parent.categoryId);
    }
  },

  Material: {
    unit: async (parent) => {
      return Unit.findById(parent.unitId);
    }
  },

  EquipmentContract: {
    contract: async (parent) => {
      return Contract.findById(parent.contractId);
    }
  },

  WorkItem: {
    category: async (parent) => {
      return Category.findById(parent.categoryId);
    },
    subCategory: async (parent) => {
      return SubCategory.findById(parent.subCategoryId);
    },
    unit: async (parent) => {
      return Unit.findById(parent.unitId);
    }
  },

  DailyActivity: {
    spk: async (parent) => {
      return SPK.findById(parent.spkId);
    },
    user: async (parent) => {
      return User.findById(parent.createdBy);
    }
  },

  ActivityDetail: {
    dailyActivity: async (parent) => {
      return DailyActivity.findById(parent.dailyActivityId);
    },
    workItem: async (parent) => {
      return WorkItem.findById(parent.workItemId);
    }
  },

  EquipmentLog: {
    dailyActivity: async (parent) => {
      return DailyActivity.findById(parent.dailyActivityId);
    },
    equipment: async (parent) => {
      return Equipment.findById(parent.equipmentId);
    }
  },

  ManpowerLog: {
    dailyActivity: async (parent) => {
      return DailyActivity.findById(parent.dailyActivityId);
    },
    personnelRole: async (parent) => {
      return PersonnelRole.findById(parent.role);
    }
  },

  MaterialUsageLog: {
    dailyActivity: async (parent) => {
      return DailyActivity.findById(parent.dailyActivityId);
    },
    material: async (parent) => {
      return Material.findById(parent.materialId);
    }
  },

  SPK: {
    location: async (parent) => {
      return Area.findById(parent.location);
    }
  },

  SPKWorkItem: {
    workItem: async (parent) => {
      return WorkItem.findById(parent.workItemId);
    }
  },

  AuthPayload: {
    user: (parent) => parent.user
  },

  User: {
    id: (parent) => parent._id || parent.id,
    role: async (parent) => {
      // Jika sudah populated
      if (parent.role && typeof parent.role === 'object' && parent.role.roleCode) {
        return {
          ...parent.role,
          id: parent.role._id,
          roleCode: parent.role.roleCode,
          roleName: parent.role.roleName,
          hourlyRate: parent.role.hourlyRate,
          description: parent.role.description,
          createdAt: parent.role.createdAt,
          updatedAt: parent.role.updatedAt
        };
      }
      // Jika role adalah ObjectId, populate dari database
      if (parent.role && mongoose.isValidObjectId(parent.role)) {
        const roleDoc = await PersonnelRole.findById(parent.role);
        if (roleDoc) {
          return {
            ...roleDoc.toObject(),
            id: roleDoc._id,
          };
        }
      }
      // Jika tidak ditemukan, return default
      return {
        id: "default",
        roleCode: "USER",
        roleName: "Regular User",
        hourlyRate: 0,
        description: "Default role"
      };
    }
  },

  OtherCost: {
    dailyActivity: async (parent) => {
      return DailyActivity.findById(parent.dailyActivityId);
    }
  }
};

// Helper functions
function calculatePhysicalProgress(dailyActivities) {
  let totalActual = 0;

  dailyActivities.forEach(activity => {
    activity.activityDetails.forEach(detail => {
      // Hitung untuk non-remote
      totalActual += detail.actualQuantity.nr || 0;
      // Hitung untuk remote
      totalActual += detail.actualQuantity.r || 0;
    });
  });

  return totalActual;
}

function calculateFinancialProgress(dailyActivities) {
  const totalCost = calculateCosts(dailyActivities).total;
  // Asumsikan total budget ada di SPK
  const totalBudget = dailyActivities[0]?.spkId?.totalBudget || 0;
  return totalBudget > 0 ? (totalCost / totalBudget) * 100 : 0;
}

function calculateCosts(dailyActivities) {
  let equipmentCost = 0;
  let manpowerCost = 0;
  let materialCost = 0;

  dailyActivities.forEach(activity => {
    // Hitung biaya equipment
    activity.equipmentLogs.forEach(log => {
      equipmentCost += log.fuelIn * log.fuelPrice;
    });

    // Hitung biaya manpower
    activity.manpowerLogs.forEach(log => {
      manpowerCost += log.personCount * log.workingHours * log.hourlyRate;
    });

    // Hitung biaya material
    activity.materialUsageLogs.forEach(log => {
      materialCost += log.quantity * log.unitPrice;
    });
  });

  return {
    equipment: equipmentCost,
    manpower: manpowerCost,
    material: materialCost,
    total: equipmentCost + manpowerCost + materialCost
  };
}

function calculateWorkItemsProgress(dailyActivities) {
  const workItemsMap = new Map();

  dailyActivities.forEach(activity => {
    activity.activityDetails.forEach(detail => {
      if (!workItemsMap.has(detail.workItemId._id)) {
        workItemsMap.set(detail.workItemId._id, {
          workItemId: detail.workItemId,
          actualQuantity: { nr: 0, r: 0 }
        });
      }

      const workItem = workItemsMap.get(detail.workItemId._id);
      workItem.actualQuantity.nr += detail.actualQuantity.nr || 0;
      workItem.actualQuantity.r += detail.actualQuantity.r || 0;
    });
  });

  return Array.from(workItemsMap.values()).map(item => ({
    ...item,
    progressPercentage: calculateWorkItemProgress(item)
  }));
}

function calculateWorkItemProgress(workItem) {
  const totalActual = workItem.actualQuantity.nr + workItem.actualQuantity.r;
  return totalActual;
}

function calculateDailyPhysicalProgress(activityDetails) {
  let totalActual = 0;

  activityDetails.forEach(detail => {
    totalActual += (detail.actualQuantity.nr || 0) + (detail.actualQuantity.r || 0);
  });

  return totalActual;
}

function calculateDailyFinancialProgress(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts = []) {
  const costs = calculateDailyCosts(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts);
  // Get total budget from SPK if needed, or set to 0
  const totalBudget = 0;
  return totalBudget > 0 ? (costs.total / totalBudget) * 100 : 0;
}

function calculateDailyCosts(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts = []) {
  let equipmentCost = 0;
  let manpowerCost = 0;
  let materialCost = 0;
  let otherCost = 0;

  equipmentLogs.forEach(log => {
    equipmentCost += log.fuelIn * log.fuelPrice;
  });

  manpowerLogs.forEach(log => {
    manpowerCost += log.personCount * (log.normalHoursPerPerson || 0) * log.normalHourlyRate;
    // Add overtime if needed
  });

  materialUsageLogs.forEach(log => {
    materialCost += log.quantity * log.unitRate;
  });

  otherCosts.forEach(cost => {
    otherCost += cost.amount;
  });

  return {
    equipment: equipmentCost,
    manpower: manpowerCost,
    material: materialCost,
    other: otherCost,
    total: equipmentCost + manpowerCost + materialCost + otherCost
  };
}

function getWeekDates(week, year) {
  const startDate = new Date(year, 0, 1 + (week - 1) * 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  return { startDate, endDate };
}

function getMonthDates(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  return { startDate, endDate };
}

// Helper functions for calculating progress percentage based on daily target
function calculateProgressPercentage(activityDetails, spk) {
  if (!spk || !spk.workItems || !spk.startDate || !spk.endDate) {
    return 0;
  }

  // Hitung total hari kerja
  const startDate = new Date(parseInt(spk.startDate));
  const endDate = new Date(parseInt(spk.endDate));
  const totalWorkDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

  // Hitung total volume BOQ dari semua item pekerjaan
  const totalBoqVolume = spk.workItems.reduce((total, item) => {
    return total + (item.boqVolume.nr + item.boqVolume.r);
  }, 0);

  // Hitung target harian
  const dailyTarget = totalBoqVolume / totalWorkDays;

  // Hitung total pekerjaan yang diselesaikan hari ini
  const totalActualVolume = activityDetails.reduce((total, detail) => {
    const actualVolume = detail.actualQuantity.nr + detail.actualQuantity.r;
    return total + actualVolume;
  }, 0);

  // Hitung persentase progres terhadap target harian
  const progressPercentage = (dailyTarget > 0) ? (totalActualVolume / dailyTarget) * 100 : 0;

  return progressPercentage;
}

module.exports = resolvers; 