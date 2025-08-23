const SPK = require('../../models/SPK');
const WorkItem = require('../../models/WorkItem');
const DailyActivity = require('../../models/DailyActivity');
const EquipmentRepairReport = require('../../models/EquipmentRepairReport');
const Contract = require('../../models/Contract');
const ActivityDetail = require('../../models/ActivityDetail');
const MaterialUsageLog = require('../../models/MaterialUsageLog');
const ManpowerLog = require('../../models/ManpowerLog');
const EquipmentLog = require('../../models/EquipmentLog');
const OtherCost = require('../../models/OtherCost');
const BorrowPit = require('../../models/BorrowPit');

const dashboardResolvers = {
  Query: {
    dashboardSummary: async (_, { timeRange, projectId }) => {
      // Abaikan parameter timeRange dan projectId, ambil semua data
      try {
        // Hitung total SPK (tidak ada field isActive)
        const totalSPK = await SPK.countDocuments({});
        
        // Hitung total dan budget SPK dengan status closed
        const closedSPKs = await SPK.find({ status: 'closed' });
        const totalClosedSPK = closedSPKs.length;
        const totalClosedSPKBudget = closedSPKs.reduce((sum, spk) => sum + (spk.budget || 0), 0);
        
        // Hitung total WorkItems (tidak ada field isActive)
        const totalWorkItems = await WorkItem.countDocuments({});
        
        // Hitung total laporan (DailyActivity + EquipmentRepairReport)
        const totalDailyActivities = await DailyActivity.countDocuments({ isActive: { $ne: false } });
        const totalRepairReports = await EquipmentRepairReport.countDocuments({ isActive: { $ne: false } });
        const totalReports = totalDailyActivities + totalRepairReports;
        
        // Monthly sales untuk 1 tahun terakhir
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        // Get all SPKs with full details (no date filter to include all SPKs)
        const spks = await SPK.find({})
        .populate({
          path: 'location',
          select: 'id name location'
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
        
        // Get all borrow pits
        const borrowPits = await BorrowPit.find({});
        
        // Get all daily activities (ignore timeRange) -> use ALL activities
        const dailyActivities = await DailyActivity.find({
          isActive: { $ne: false }
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
        // Ensure a monthly entry exists for given year-month
        function ensureMonthlyEntry(year, month) {
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
          return key;
        }
        
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
          const key = ensureMonthlyEntry(year, month);
          
          const cost = (log.quantity || 0) * (log.unitRate || log.materialId?.unitRate || 0);
          monthlyData[key].cost += cost;
          monthlyData[key].costBreakdown.material += cost;
        });
        
        manpowerLogs.forEach(log => {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === log.dailyActivityId.toString());
          if (!dailyActivity) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = ensureMonthlyEntry(year, month);
          
          const cost = (log.personCount || 0) * (log.workingHours || 0) * (log.hourlyRate || 0);
          monthlyData[key].cost += cost;
          monthlyData[key].costBreakdown.manpower += cost;
        });
        
        equipmentLogs.forEach(log => {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === log.dailyActivityId.toString());
          if (!dailyActivity) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = ensureMonthlyEntry(year, month);
          
          const fuelCost = (log.fuelIn || 0) * (log.fuelPrice || 0);
          const rentalCost = (log.workingHour || 0) * (log.hourlyRate || 0);
          const cost = fuelCost + rentalCost;
          monthlyData[key].cost += cost;
          monthlyData[key].costBreakdown.equipment += cost;
        });
        
        otherCosts.forEach(cost => {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === cost.dailyActivityId.toString());
          if (!dailyActivity) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = ensureMonthlyEntry(year, month);
          
          monthlyData[key].cost += cost.amount || 0;
          monthlyData[key].costBreakdown.other += cost.amount || 0;
        });
        
        // Convert to array and format - removed duplicate monthlySales definition

        // Build SPK -> workItemId -> rates map to use SPK-local rates for activity-based sales
        const spkRatesMap = new Map();
        for (const spk of spks) {
          const wiRateMap = new Map();
          for (const wi of spk.workItems || []) {
            const wid = wi.workItemId ? wi.workItemId._id?.toString?.() || wi.workItemId.toString() : null;
            if (!wid) continue;
            const nrRate = wi.rates?.nr?.rate || 0;
            const rRate = wi.rates?.r?.rate || 0;
            wiRateMap.set(wid, { nrRate, rRate });
          }
          spkRatesMap.set(spk._id.toString(), wiRateMap);
        }

        // Map of DailyActivity by id for quick lookup of date and spkId
        const daMap = new Map(dailyActivities.map(da => [da._id.toString(), da]));

        // Load all activity details for ALL activities (ignore timeRange)
        const allActivityDetails = await ActivityDetail.find({
          dailyActivityId: { $in: dailyActivities.map(da => da._id) }
        }).populate('workItemId');

        // Aggregate sales by activity month-year using SPK-local rates
        const activityMonthlySales = {};
        for (const detail of allActivityDetails) {
          const daId = detail.dailyActivityId?.toString();
          const da = daMap.get(daId);
          if (!da) continue;
          const spkIdStr = da.spkId?.toString();
          if (!spkIdStr) continue;

          const workItemIdStr = detail.workItemId?._id?.toString?.() || detail.workItemId?.toString();
          if (!workItemIdStr) continue;

          const year = da.date.getFullYear();
          const month = da.date.getMonth() + 1;
          const key = `${year}-${month}`;

          // Get SPK-local rates
          const wiRateMap = spkRatesMap.get(spkIdStr);
          const rates = wiRateMap ? wiRateMap.get(workItemIdStr) : undefined;
          const nrRate = rates?.nrRate || 0;
          const rRate = rates?.rRate || 0;

          const nrQty = detail.actualQuantity?.nr || 0;
          const rQty = detail.actualQuantity?.r || 0;
          const amount = (nrQty * nrRate) + (rQty * rRate);

          if (!activityMonthlySales[key]) {
            activityMonthlySales[key] = { year, month, sales: 0, count: 0 };
          }
          activityMonthlySales[key].sales += amount;
          activityMonthlySales[key].count += 1;
        }

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

        // Get all daily activities for each SPK for progress calculation
        const spkDailyActivities = {};
        for (const da of dailyActivities) {
          if (!da.spkId) continue;
          const spkId = da.spkId.toString();
          if (!spkDailyActivities[spkId]) {
            spkDailyActivities[spkId] = [];
          }
          spkDailyActivities[spkId].push(da);
        }

        // Calculate enhanced SPK Performance with details like spkDetailsWithProgress
        const spkPerformance = await Promise.all(spks.map(async spk => {
          const totalWorkItemsAmount = spk.workItems.reduce((total, item) => total + (item.amount || 0), 0);
          
          // Calculate progress for each work item based on activity details
          const spkId = spk._id.toString();
          const spkActivities = spkDailyActivities[spkId] || [];
          
          // Gunakan logika yang sama dengan spkDetailsWithProgress untuk progress
          // Get all activity details for these daily activities
          const activityDetails = await ActivityDetail.find({
            dailyActivityId: { $in: spkActivities.map(da => da._id) }
          }).populate('workItemId');
          
          // Calculate total BOQ volumes for target and completed seperti di spkDetailsWithProgress
          const totalTargetBOQ = spk.workItems.reduce((total, item) => {
            const nr = item.boqVolume?.nr || 0;
            const r = item.boqVolume?.r || 0;
            return total + nr + r;
          }, 0);
          
          const totalCompletedBOQ = activityDetails.reduce((total, detail) => {
            const nr = detail.actualQuantity?.nr || 0;
            const r = detail.actualQuantity?.r || 0;
            return total + nr + r;
          }, 0);
          
          // BOQ-based progress percentage: (completed / target) * 100
          const boqProgressPercentage = totalTargetBOQ > 0 ? (totalCompletedBOQ / totalTargetBOQ) * 100 : 0;
          
          // Debug logging untuk melihat perhitungan BOQ
          console.log(`[Dashboard BOQ Debug] SPK ${spk.spkNo}:`);
          console.log(`  - Total Target BOQ: ${totalTargetBOQ}`);
          console.log(`  - Total Completed BOQ: ${totalCompletedBOQ}`);
          console.log(`  - BOQ Progress Percentage: ${boqProgressPercentage}%`);
          console.log(`  - Activity Details Count: ${activityDetails.length}`);
          console.log(`  - SPK Activities Count: ${spkActivities.length}`);
          
          // Get detailed work items with progress
          const workItems = [];
          
          // Pastikan setiap SPK memiliki setidaknya satu work item default jika tidak ada data
          // untuk menghindari field workItems bernilai null
          if (!spk.workItems || spk.workItems.length === 0) {
            workItems.push({
              workItemId: spk._id, // Gunakan SPK ID sebagai placeholder
              name: 'Default Work Item',
              description: '',
              quantity: 0,
              unit: '',
              unitPrice: 0,
              amount: 0,
              category: '',
              subCategory: ''
            });
          } else {
            // Ekstrak detail workItems jika ada data
            for (const item of spk.workItems) {
              const workItem = item.workItemId;
              if (!workItem) continue;
              
              workItems.push({
                workItemId: workItem._id,
                name: workItem.name || 'Unknown Work Item',
                description: workItem.description || '',
                quantity: item.boqVolume ? (item.boqVolume.nr + item.boqVolume.r) : 0,
                unit: workItem.unitId && workItem.unitId.name ? workItem.unitId.name : '',
                unitPrice: item.rates ? (item.rates.nr && item.rates.nr.rate ? item.rates.nr.rate : 0) : 0,
                amount: item.amount || 0,
                category: workItem.categoryId && workItem.categoryId.name ? workItem.categoryId.name : '',
                subCategory: workItem.subCategoryId && workItem.subCategoryId.name ? workItem.subCategoryId.name : ''
              });
            }
            
            // Jika semua workItems gagal diproses, tambahkan item default
            if (workItems.length === 0) {
              workItems.push({
                workItemId: spk._id,
                name: 'Default Work Item',
                description: '',
                quantity: 0,
                unit: '',
                unitPrice: 0,
                amount: 0,
                category: '',
                subCategory: ''
              });
            }
          }
          
          // Calculate cost breakdown untuk SPK ini
          const spkActivitiesIds = spkActivities.map(activity => activity._id.toString());
          
          // Filter material logs untuk SPK ini
          const spkMaterialLogs = materialLogs.filter(log => 
            log.dailyActivityId && spkActivitiesIds.includes(log.dailyActivityId.toString()));
          
          // Filter manpower logs untuk SPK ini
          const spkManpowerLogs = manpowerLogs.filter(log => 
            log.dailyActivityId && spkActivitiesIds.includes(log.dailyActivityId.toString()));
          
          // Filter equipment logs untuk SPK ini
          const spkEquipmentLogs = equipmentLogs.filter(log => 
            log.dailyActivityId && spkActivitiesIds.includes(log.dailyActivityId.toString()));

          // Calculate cost breakdown
          const spkMaterialCost = spkMaterialLogs.reduce((total, log) => 
            total + ((log.quantity || 0) * (log.unitRate || log.materialId?.unitRate || 0)), 0);

          const spkManpowerCost = spkManpowerLogs.reduce((total, log) => 
            total + ((log.personCount || 0) * (log.workingHours || 0) * (log.hourlyRate || 0)), 0);

          const spkEquipmentCost = spkEquipmentLogs.reduce((total, log) => {
            const fuelCost = (log.fuelIn || 0) * (log.fuelPrice || 0);
            // Menggunakan rentalRatePerDay, dengan perhitungan yang sama seperti di atas
            let rentalCost = 0;
            if (log.rentalRatePerDay && log.rentalRatePerDay > 0) {
              const workingHour = (log.workingHour || log.workingHours || 0);
              const days = workingHour >= 8 ? 1 : workingHour / 8;
              rentalCost = days * log.rentalRatePerDay;
            } else {
              rentalCost = (log.workingHour || log.workingHours || 0) * (log.hourlyRate || 0);
            }
            return total + fuelCost + rentalCost;
          }, 0);

          // Total actual cost
          const spkTotalActualCost = spkMaterialCost + spkManpowerCost + spkEquipmentCost;

          // Enhanced financial progress calculations
          const spkBudget = spk.budget || 0;
          const spkTotalPlannedCost = totalWorkItemsAmount || 0;
          const spkRemainingBudget = spkBudget - spkTotalActualCost;

          // Cost breakdown structure
          const costBreakdown = {
            materials: {
              amount: spkMaterialCost,
              percentage: spkTotalActualCost > 0 ? (spkMaterialCost / spkTotalActualCost) * 100 : 0,
              count: spkMaterialLogs.length
            },
            manpower: {
              amount: spkManpowerCost,
              percentage: spkTotalActualCost > 0 ? (spkManpowerCost / spkTotalActualCost) * 100 : 0,
              count: spkManpowerLogs.length
            },
            equipment: {
              amount: spkEquipmentCost,
              percentage: spkTotalActualCost > 0 ? (spkEquipmentCost / spkTotalActualCost) * 100 : 0,
              count: spkEquipmentLogs.length
            }
          };
          
          // Calculate progress metrics menggunakan nilai progress fisik (boqProgressPercentage)
          const workItemCompletionPercentage = boqProgressPercentage;
          const budgetUtilizationPercentage = spkBudget > 0 ? (spkTotalActualCost / spkBudget) * 100 : 0;
          
          // PlannedVsActualCostRatio langsung menggunakan nilai boqProgressPercentage
          // (mengabaikan perhitungan biaya sesuai permintaan)
          const plannedVsActualCostRatio = boqProgressPercentage;
          
          return {
            spkId: spk._id.toString(),
            spkNo: spk.spkNo,
            title: spk.title,
            projectName: spk.projectName,
            budget: spk.budget,
            workItemsAmount: totalWorkItemsAmount,
            workItemsCount: spk.workItems.length,
            date: spk.date.toISOString(),
            location: spk.location ? {
              locationId: spk.location._id,
              name: spk.location.name,
              latitude: spk.location.location && spk.location.location.coordinates ? spk.location.location.coordinates[1] : null,
              longitude: spk.location.location && spk.location.location.coordinates ? spk.location.location.coordinates[0] : null
            } : null,
            workItems: workItems,
            completedAmount: totalCompletedBOQ,
            progressPercentage: boqProgressPercentage,
            activityCount: spkActivities.length,
            // New fields for enhanced financial metrics
            totalProgress: {
              percentage: Math.round(workItemCompletionPercentage * 100) / 100,
              totalBudget: spkBudget,
              totalSpent: spkTotalActualCost,
              remainingBudget: spkRemainingBudget,
              budgetUtilizationPercentage: Math.round(budgetUtilizationPercentage * 100) / 100,
              plannedVsActualCostRatio: Math.round(plannedVsActualCostRatio * 100) / 100,
              totalPlannedCost: spkTotalPlannedCost,
              isOverBudget: spkTotalActualCost > spkBudget,
              costBreakdown: costBreakdown
            }
          };
        }));

        // Chart data - Cost Breakdown (Total cost per kategori)
        const totalMaterialCost = materialLogs.reduce((total, log) => 
          total + ((log.quantity || 0) * (log.unitRate || log.materialId?.unitRate || 0)), 0);

        const totalManpowerCost = manpowerLogs.reduce((total, log) => 
          total + ((log.personCount || 0) * (log.workingHours || 0) * (log.hourlyRate || 0)), 0);

        // Split equipment costs into fuel and rental
        const totalEquipmentFuelCost = equipmentLogs.reduce((total, log) => 
          total + ((log.fuelIn || 0) * (log.fuelPrice || 0)), 0);
        // Menggunakan rentalRatePerDay, jika workingHour >= 8 jam berarti satu hari penuh
        const totalEquipmentRentalCost = equipmentLogs.reduce((total, log) => {
          // Jika ada rentalRatePerDay, gunakan itu
          if (log.rentalRatePerDay && log.rentalRatePerDay > 0) {
            // Hitung berapa hari kerja berdasarkan workingHour
            const workingHour = (log.workingHour || log.workingHours || 0);
            const days = workingHour >= 8 ? 1 : workingHour / 8; // 8 jam = 1 hari kerja
            return total + (days * log.rentalRatePerDay);
          } else {
            // Fallback ke hourlyRate jika rentalRatePerDay tidak ada
            return total + ((log.workingHour || log.workingHours || 0) * (log.hourlyRate || 0));
          }
        }, 0);
        const totalEquipmentCost = totalEquipmentFuelCost + totalEquipmentRentalCost;

        // Other costs: total and breakdown by costType
        const totalOtherCost = otherCosts.reduce((total, cost) => total + (cost.amount || 0), 0);
        const otherBreakdownMap = {};
        otherCosts.forEach(c => {
          const key = c.costType || 'UNKNOWN';
          if (!otherBreakdownMap[key]) otherBreakdownMap[key] = { total: 0, count: 0 };
          otherBreakdownMap[key].total += (c.amount || 0);
          otherBreakdownMap[key].count += 1;
        });
        const otherBreakdown = Object.entries(otherBreakdownMap).map(([costType, v]) => ({ costType, total: v.total, count: v.count }));

        const costBreakdown = {
          material: totalMaterialCost,
          manpower: totalManpowerCost,
          equipment: totalEquipmentCost,
          other: totalOtherCost,
          total: totalMaterialCost + totalManpowerCost + totalEquipmentCost + totalOtherCost,
          // Required fields for CostBreakdownTotal type
          itemCost: totalMaterialCost,
          workCost: totalManpowerCost,
          equipmentCost: totalEquipmentCost,
          laborCost: totalManpowerCost,
          mobilizationCost: totalOtherCost * 0.3, // Example allocation of other costs
          demobilizationCost: totalOtherCost * 0.2, // Example allocation of other costs
          totalCost: totalMaterialCost + totalManpowerCost + totalEquipmentCost + totalOtherCost,
          totalMaterialCost: totalMaterialCost,
          totalManpowerCost: totalManpowerCost,
          totalEquipmentCost: totalEquipmentCost,
          // Added detailed equipment and other cost breakdowns
          equipmentFuelCost: totalEquipmentFuelCost,
          equipmentRentalCost: totalEquipmentRentalCost,
          otherBreakdown: otherBreakdown
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
        
        // Calculate total sales and costs from monthly data
        const totalSales = Object.values(activityMonthlySales).reduce((total, item) => total + item.sales, 0);
        const totalCosts = Object.values(monthlyData).reduce((total, item) => total + item.cost, 0);
        
        // We'll use the costBreakdown object that's already defined below
        
        // Format monthly sales for schema from activities (sum of executed quantities * SPK-local rates)
        const monthlySales = Object.values(activityMonthlySales)
          .sort((a, b) => (a.year - b.year) || (a.month - b.month))
          .map(item => ({
            year: item.year,
            month: item.month,
            monthName: getMonthName(item.month),
            amount: item.sales,
            totalSales: item.sales,
            count: item.count || 0
          }));
        
        // Format monthly costs for schema
        const monthlyCosts = Object.values(monthlyData).map(item => ({
          year: item.year,
          month: item.month,
          monthName: getMonthName(item.month),
          amount: item.cost,
          totalCosts: item.cost,
          count: item.spkCount || 0
        }));
        
        // Format progress by month data
        const progressByMonth = Object.values(monthlyData).map(item => {
          // Calculate progress percentage (example calculation, adjust as needed)
          const percentage = item.sales > 0 ? 
            Math.min(100, (item.cost / item.sales * 100)) : 0;
            
          return {
            year: item.year,
            month: item.month,
            monthName: getMonthName(item.month),
            percentage: percentage,
            progressPercentage: percentage
          };
        });
        
        // Create equipment performance data
        const equipmentPerformance = [];
        // This would normally be populated from equipment logs, for now add placeholder
        if (equipmentLogs.length > 0) {
          // Group equipment logs by equipment ID
          const equipmentGroups = {};
          equipmentLogs.forEach(log => {
            if (!equipmentGroups[log.equipmentId]) {
              equipmentGroups[log.equipmentId] = {
                workingHours: 0,
                maintenanceHours: 0,
                logs: []
              };
            }
            equipmentGroups[log.equipmentId].workingHours += (log.workingHours || 0);
            equipmentGroups[log.equipmentId].logs.push(log);
          });
          
          // Create performance data for each equipment
          for (const [eqId, data] of Object.entries(equipmentGroups)) {
            equipmentPerformance.push({
              equipmentId: eqId,
              id: eqId,
              name: `Equipment ${eqId}`,
              totalWorkingHours: data.workingHours,
              totalMaintenanceHours: data.maintenanceHours || 0,
              utilizationRate: data.workingHours > 0 ? 
                (data.workingHours / (data.workingHours + data.maintenanceHours)) * 100 : 0
            });
          }
        }
        
        // Fungsi untuk menghitung persentase total budget SPK terhadap contract budget
        async function calculateTotalSpkContractPercentage() {
          try {
            // Ambil semua kontrak
            const contracts = await Contract.find({});
            
            // Hitung total budget kontrak
            const totalContractBudget = contracts.reduce((sum, contract) => sum + (contract.totalBudget || 0), 0);
            
            // Ambil semua SPK beserta contractNo
            const allSpks = await SPK.find({});
            
            // Hitung total budget SPK berdasarkan contractNo
            const spkBudgetsByContract = {};
            
            allSpks.forEach(spk => {
              const contractNo = spk.contractNo || (spk.contractor ? extractContractNo(spk.contractor) : null);
              
              if (contractNo) {
                if (!spkBudgetsByContract[contractNo]) {
                  spkBudgetsByContract[contractNo] = 0;
                }
                spkBudgetsByContract[contractNo] += (spk.budget || 0);
              }
            });
            
            // Hitung total budget SPK
            const totalSpkBudget = Object.values(spkBudgetsByContract).reduce((sum, budget) => sum + budget, 0);
            
            // Hitung persentase
            const percentage = totalContractBudget > 0 ? 
              (totalSpkBudget / totalContractBudget) * 100 : 0;
            
            // Kembalikan objek sesuai dengan TotalSpkContract type
            return {
              percentage: parseFloat(percentage.toFixed(2)),
              totalBudgetSpk: parseFloat(totalSpkBudget.toFixed(2)),
              totalBudgetContract: parseFloat(totalContractBudget.toFixed(2))
            };
          } catch (error) {
            console.error('Error calculating totalSpkContract:', error);
            return {
              percentage: 0,
              totalBudgetSpk: 0,
              totalBudgetContract: 0
            };
          }
        }

        // Helper function untuk ekstrak contractNo dari contractor string
        function extractContractNo(contractor) {
          if (contractor) {
            const contractMatch = contractor.match(/^([A-Z0-9]+)\s*\[/);
            if (contractMatch && contractMatch[1]) {
              return contractMatch[1].trim();
            }
          }
          return null;
        }
        
        // Helper function to get month name
        function getMonthName(month) {
          const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];
          return monthNames[month - 1] || 'Unknown';
        }
        
        return {
          // Summary data
          totalSPK,
          totalWorkItems,
          totalReports,
          totalDailyActivities,
          totalRepairReports,
          totalSales,
          totalCosts,
          totalspkclose: {
            totalSpk: totalClosedSPK,
            totalBudgetSpk: totalClosedSPKBudget
          },
          monthlySales,
          monthlyCosts,
          progressByMonth,
          monthlyCapaian,
          borrowPitLocations: borrowPits.map(pit => ({
            borrowPitId: pit._id,
            name: pit.name,
            locationName: pit.locationName || pit.name,
            latitude: pit.coordinates && pit.coordinates.coordinates ? pit.coordinates.coordinates[1] : null,
            longitude: pit.coordinates && pit.coordinates.coordinates ? pit.coordinates.coordinates[0] : null
          })),
          contractProgressPercent: 0,
          totalSpkContract: await calculateTotalSpkContractPercentage(),
          // Chart data
          spkPerformance,
          // Make sure costBreakdown has all required fields for CostBreakdownTotal type
          costBreakdown: {
            ...costBreakdown,
            // Add fields required by CostBreakdownTotal type if not already present
            itemCost: costBreakdown.material || 0,
            workCost: costBreakdown.manpower || 0,
            equipmentCost: costBreakdown.equipment || 0,
            laborCost: costBreakdown.manpower || 0,
            mobilizationCost: costBreakdown.other ? costBreakdown.other * 0.3 : 0, // Example allocation
            demobilizationCost: costBreakdown.other ? costBreakdown.other * 0.2 : 0, // Example allocation
            totalCost: costBreakdown.total || 0,
            totalMaterialCost: costBreakdown.material || 0,
            totalManpowerCost: costBreakdown.manpower || 0,
            totalEquipmentCost: costBreakdown.equipment || 0
          },
          monthlyTrend,
          workItemsDistribution,
          activityStatusDistribution,
          equipmentPerformance
        };
      } catch (error) {
        throw new Error(`Error fetching dashboard summary: ${error.message}`);
      }
    }
  }
};

module.exports = dashboardResolvers; 