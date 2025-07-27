const SPK = require('../../models/SPK');
const WorkItem = require('../../models/WorkItem');
const DailyActivity = require('../../models/DailyActivity');
const EquipmentRepairReport = require('../../models/EquipmentRepairReport');
const ActivityDetail = require('../../models/ActivityDetail');
const MaterialUsageLog = require('../../models/MaterialUsageLog');
const ManpowerLog = require('../../models/ManpowerLog');
const EquipmentLog = require('../../models/EquipmentLog');
const OtherCost = require('../../models/OtherCost');

const dashboardResolvers = {
  Query: {
    dashboardSummary: async () => {
      try {
        // Hitung total SPK (tidak ada field isActive)
        const totalSPK = await SPK.countDocuments({});
        
        // Hitung total WorkItems (tidak ada field isActive)
        const totalWorkItems = await WorkItem.countDocuments({});
        
        // Hitung total laporan (DailyActivity + EquipmentRepairReport)
        const totalDailyActivities = await DailyActivity.countDocuments({ isActive: { $ne: false } });
        const totalRepairReports = await EquipmentRepairReport.countDocuments({ isActive: { $ne: false } });
        const totalReports = totalDailyActivities + totalRepairReports;
        
        // Monthly sales untuk 1 tahun terakhir
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        // Get all SPKs for the last year
        const spks = await SPK.find({
          date: { $gte: oneYearAgo }
        }).populate('workItems.workItemId');
        
        // Get all daily activities for the last year
        const dailyActivities = await DailyActivity.find({
          isActive: { $ne: false },
          date: { $gte: oneYearAgo }
        });
        
        // Get all cost logs
        const materialLogs = await MaterialUsageLog.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }).populate('materialId');
        
        const manpowerLogs = await ManpowerLog.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }).populate('role');
        
        const equipmentLogs = await EquipmentLog.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        });
        
        const otherCosts = await OtherCost.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        });
        
        // Group data by month
        const monthlyData = {};
        
        // Process SPKs (Sales calculation based on workItems amount)
        spks.forEach(spk => {
          const year = spk.date.getFullYear();
          const month = spk.date.getMonth() + 1;
          const key = `${year}-${month}`;
          
          if (!monthlyData[key]) {
            monthlyData[key] = {
              year,
              month,
              sales: 0,
              cost: 0,
              costBreakdown: {
                material: 0,
                manpower: 0,
                equipment: 0,
                other: 0
              },
              spkCount: 0,
              spkIds: []
            };
          }
          
          // Calculate sales based on workItems amount
          const workItemsSales = spk.workItems.reduce((total, item) => {
            return total + (item.amount || 0);
          }, 0);
          
          monthlyData[key].sales += workItemsSales;
          monthlyData[key].spkCount += 1;
          monthlyData[key].spkIds.push(spk._id.toString());
        });
        
        // Process cost logs (Cost calculation with breakdown)
        materialLogs.forEach(log => {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === log.dailyActivityId.toString());
          if (!dailyActivity) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = `${year}-${month}`;
          
          if (monthlyData[key]) {
            const cost = (log.quantity || 0) * (log.unitRate || log.materialId?.unitRate || 0);
            monthlyData[key].cost += cost;
            monthlyData[key].costBreakdown.material += cost;
          }
        });
        
        manpowerLogs.forEach(log => {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === log.dailyActivityId.toString());
          if (!dailyActivity) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = `${year}-${month}`;
          
          if (monthlyData[key]) {
            const cost = (log.personCount || 0) * (log.workingHours || 0) * (log.hourlyRate || 0);
            monthlyData[key].cost += cost;
            monthlyData[key].costBreakdown.manpower += cost;
          }
        });
        
        equipmentLogs.forEach(log => {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === log.dailyActivityId.toString());
          if (!dailyActivity) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = `${year}-${month}`;
          
          if (monthlyData[key]) {
            const fuelCost = (log.fuelIn || 0) * (log.fuelPrice || 0);
            const rentalCost = (log.workingHour || 0) * (log.hourlyRate || 0);
            const cost = fuelCost + rentalCost;
            monthlyData[key].cost += cost;
            monthlyData[key].costBreakdown.equipment += cost;
          }
        });
        
        otherCosts.forEach(cost => {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === cost.dailyActivityId.toString());
          if (!dailyActivity) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = `${year}-${month}`;
          
          if (monthlyData[key]) {
            monthlyData[key].cost += cost.amount || 0;
            monthlyData[key].costBreakdown.other += cost.amount || 0;
          }
        });
        
        // Convert to array and format
        const monthlySales = Object.values(monthlyData)
          .map(data => ({
            year: data.year,
            month: data.month,
            monthName: {
              1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April', 5: 'Mei', 6: 'Juni',
              7: 'Juli', 8: 'Agustus', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
            }[data.month] || 'Unknown',
            sales: data.sales,
            cost: data.cost,
            costBreakdown: {
              material: data.costBreakdown.material,
              manpower: data.costBreakdown.manpower,
              equipment: data.costBreakdown.equipment,
              other: data.costBreakdown.other
            },
            profit: data.sales - data.cost,
            profitMargin: data.sales > 0 ? ((data.sales - data.cost) / data.sales) * 100 : 0,
            spkCount: data.spkCount
          }))
          .sort((a, b) => a.year - b.year || a.month - b.month);
        
        // Monthly capaian untuk semua SPK (berdasarkan DailyActivity)
        const monthlyCapaian = await DailyActivity.aggregate([
          {
            $match: {
              isActive: { $ne: false },
              date: { $gte: oneYearAgo }
            }
          },
          {
            $lookup: {
              from: 'spks',
              localField: 'spkId',
              foreignField: '_id',
              as: 'spk'
            }
          },
          {
            $unwind: '$spk'
          },
          {
            $group: {
              _id: {
                year: { $year: '$date' },
                month: { $month: '$date' },
                spkId: '$spkId'
              },
              spkTitle: { $first: '$spk.title' },
              spkBudget: { $first: '$spk.budget' },
              activityCount: { $sum: 1 },
              totalBudget: { $first: '$spk.budget' }
            }
          },
          {
            $group: {
              _id: {
                year: '$_id.year',
                month: '$_id.month'
              },
              spkProgress: {
                $push: {
                  spkId: '$_id.spkId',
                  spkTitle: '$spkTitle',
                  spkBudget: '$spkBudget',
                  activityCount: '$activityCount'
                }
              },
              totalSPKActive: { $sum: 1 },
              totalBudget: { $sum: '$totalBudget' }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1 }
          },
          {
            $project: {
              _id: 0,
              year: '$_id.year',
              month: '$_id.month',
              monthName: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$_id.month', 1] }, then: 'Januari' },
                    { case: { $eq: ['$_id.month', 2] }, then: 'Februari' },
                    { case: { $eq: ['$_id.month', 3] }, then: 'Maret' },
                    { case: { $eq: ['$_id.month', 4] }, then: 'April' },
                    { case: { $eq: ['$_id.month', 5] }, then: 'Mei' },
                    { case: { $eq: ['$_id.month', 6] }, then: 'Juni' },
                    { case: { $eq: ['$_id.month', 7] }, then: 'Juli' },
                    { case: { $eq: ['$_id.month', 8] }, then: 'Agustus' },
                    { case: { $eq: ['$_id.month', 9] }, then: 'September' },
                    { case: { $eq: ['$_id.month', 10] }, then: 'Oktober' },
                    { case: { $eq: ['$_id.month', 11] }, then: 'November' },
                    { case: { $eq: ['$_id.month', 12] }, then: 'Desember' }
                  ],
                  default: 'Unknown'
                }
              },
              spkProgress: 1,
              totalSPKActive: 1,
              totalBudget: 1
            }
          }
        ]);

        // Chart data - SPK Performance (Top 10 SPK berdasarkan budget)
        const topSPKs = await SPK.find({
          date: { $gte: oneYearAgo }
        })
        .populate('workItems.workItemId')
        .sort({ budget: -1 })
        .limit(10);

        const spkPerformance = topSPKs.map(spk => {
          const totalWorkItemsAmount = spk.workItems.reduce((total, item) => total + (item.amount || 0), 0);
          return {
            spkId: spk._id.toString(),
            spkNo: spk.spkNo,
            title: spk.title,
            projectName: spk.projectName,
            budget: spk.budget,
            workItemsAmount: totalWorkItemsAmount,
            workItemsCount: spk.workItems.length,
            date: spk.date.toISOString()
          };
        });

        // Chart data - Cost Breakdown (Total cost per kategori)
        const totalMaterialCost = materialLogs.reduce((total, log) => 
          total + ((log.quantity || 0) * (log.unitRate || log.materialId?.unitRate || 0)), 0);

        const totalManpowerCost = manpowerLogs.reduce((total, log) => 
          total + ((log.personCount || 0) * (log.workingHours || 0) * (log.hourlyRate || 0)), 0);

        const totalEquipmentCost = equipmentLogs.reduce((total, log) => {
          const fuelCost = (log.fuelIn || 0) * (log.fuelPrice || 0);
          const rentalCost = (log.workingHour || 0) * (log.hourlyRate || 0);
          return total + fuelCost + rentalCost;
        }, 0);

        const totalOtherCost = otherCosts.reduce((total, cost) => total + (cost.amount || 0), 0);

        const costBreakdown = {
          material: totalMaterialCost,
          manpower: totalManpowerCost,
          equipment: totalEquipmentCost,
          other: totalOtherCost,
          total: totalMaterialCost + totalManpowerCost + totalEquipmentCost + totalOtherCost
        };

        // Chart data - Monthly Trend (Sales trend)
        const monthlyTrend = await SPK.aggregate([
          {
            $match: {
              date: { $gte: oneYearAgo }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$date' },
                month: { $month: '$date' }
              },
              totalSales: { $sum: '$budget' },
              spkCount: { $sum: 1 }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1 }
          },
          {
            $project: {
              _id: 0,
              year: '$_id.year',
              month: '$_id.month',
              monthName: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$_id.month', 1] }, then: 'Januari' },
                    { case: { $eq: ['$_id.month', 2] }, then: 'Februari' },
                    { case: { $eq: ['$_id.month', 3] }, then: 'Maret' },
                    { case: { $eq: ['$_id.month', 4] }, then: 'April' },
                    { case: { $eq: ['$_id.month', 5] }, then: 'Mei' },
                    { case: { $eq: ['$_id.month', 6] }, then: 'Juni' },
                    { case: { $eq: ['$_id.month', 7] }, then: 'Juli' },
                    { case: { $eq: ['$_id.month', 8] }, then: 'Agustus' },
                    { case: { $eq: ['$_id.month', 9] }, then: 'September' },
                    { case: { $eq: ['$_id.month', 10] }, then: 'Oktober' },
                    { case: { $eq: ['$_id.month', 11] }, then: 'November' },
                    { case: { $eq: ['$_id.month', 12] }, then: 'Desember' }
                  ],
                  default: 'Unknown'
                }
              },
              totalSales: 1,
              spkCount: 1
            }
          }
        ]);

        // Chart data - Work Items Distribution
        const workItemsDistribution = await WorkItem.aggregate([
          {
            $lookup: {
              from: 'categories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'category'
            }
          },
          {
            $unwind: { path: '$category', preserveNullAndEmptyArrays: true }
          },
          {
            $group: {
              _id: '$category.name',
              count: { $sum: 1 },
              categoryName: { $first: '$category.name' }
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $project: {
              _id: 0,
              categoryName: { $ifNull: ['$categoryName', 'Uncategorized'] },
              count: 1
            }
          }
        ]);

        // Chart data - Activity Status Distribution
        const activityStatusDistribution = await DailyActivity.aggregate([
          {
            $match: {
              isActive: { $ne: false },
              date: { $gte: oneYearAgo }
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: 1
            }
          }
        ]);
        
        return {
          // Summary data
          totalSPK,
          totalWorkItems,
          totalReports,
          totalDailyActivities,
          totalRepairReports,
          monthlySales,
          monthlyCapaian,
          spkLocations: spks.map(spk => ({
            spkId: spk._id,
            name: spk.title || spk.spkNo,
            latitude: spk.location && spk.location.coordinates ? spk.location.coordinates[1] : null,
            longitude: spk.location && spk.location.coordinates ? spk.location.coordinates[0] : null
          })),
          borrowPitLocations: [], // Dummy data for now
          contractProgressPercent: 0,
          planVsActual: {
            plan: 0,
            actual: 0
          },
          // Chart data
          spkPerformance,
          costBreakdown,
          monthlyTrend,
          workItemsDistribution,
          activityStatusDistribution
        };
      } catch (error) {
        throw new Error(`Error fetching dashboard summary: ${error.message}`);
      }
    }
  }
};

module.exports = dashboardResolvers; 