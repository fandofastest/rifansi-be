const SPK = require('../../models/SPK');
const WorkItem = require('../../models/WorkItem');
const DailyActivity = require('../../models/DailyActivity');
const EquipmentRepairReport = require('../../models/EquipmentRepairReport');
const Contract = require('../../models/Contract');
const ActivityDetail = require('../../models/ActivityDetail');
const MaterialUsageLog = require('../../models/MaterialUsageLog');
const ManpowerLog = require('../../models/ManpowerLog');
const SalaryComponent = require('../../models/SalaryComponent');
const OvertimeRate = require('../../models/OvertimeRate');
const Holiday = require('../../models/Holiday');
const EquipmentLog = require('../../models/EquipmentLog');
const OtherCost = require('../../models/OtherCost');
const BorrowPit = require('../../models/BorrowPit');
const Equipment = require('../../models/Equipment');
const FuelPrice = require('../../models/FuelPrice');

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
        
        // Map SPK meta for quick lookup when building breakdowns
        const spkMetaById = new Map();
        for (const spk of spks) {
          spkMetaById.set(spk._id.toString(), { spkNo: spk.spkNo, title: spk.title });
        }

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

        // Preload equipment fuel types and latest fuel prices per type for fuel price fallback
        const equipmentIds = [...new Set(equipmentLogs
          .map(l => l.equipmentId ? l.equipmentId.toString() : null)
          .filter(Boolean))];
        const equipments = equipmentIds.length > 0
          ? await Equipment.find({ _id: { $in: equipmentIds } })
          : [];
        const equipmentFuelTypeById = new Map(
          (equipments || []).map(e => [e._id.toString(), e.fuelType || null])
        );
        const fuelTypes = [...new Set([...equipmentFuelTypeById.values()].filter(Boolean))];
        const latestFuelPriceByType = {};
        for (const ft of fuelTypes) {
          const latest = await FuelPrice.findOne({
            fuelType: ft,
            effectiveDate: { $lte: new Date() }
          }).sort({ effectiveDate: -1 });
          latestFuelPriceByType[ft] = latest ? (latest.pricePerLiter || 0) : 0;
        }
        function getEffectiveFuelPrice(log) {
          const explicit = (log.fuelPrice || 0);
          if (explicit > 0) return explicit;
          const eqId = log.equipmentId ? log.equipmentId.toString() : null;
          const ft = eqId ? equipmentFuelTypeById.get(eqId) : null;
          return ft ? (latestFuelPriceByType[ft] || 0) : 0;
        }

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
          // Skip if SPK doesn't have spkNo (cacad)
          if (!spk.spkNo) return;
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
          // Skip if SPK doesn't have spkNo (cacad)
          const spkIdStr = dailyActivity.spkId ? dailyActivity.spkId.toString() : null;
          const spkMeta = spkIdStr ? spkMetaById.get(spkIdStr) : null;
          if (!spkMeta || !spkMeta.spkNo) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = ensureMonthlyEntry(year, month);
          
          const cost = (log.quantity || 0) * (log.unitRate || log.materialId?.unitRate || 0);
          monthlyData[key].cost += cost;
          monthlyData[key].costBreakdown.material += cost;
        });
        
        // Helper to compute hourly rate (manpowerHarian/8) with Sunday treated as holiday
        async function computeHourlyFromCost(log, daDate) {
          try {
            const workHours = log?.workingHours || 0;
            if (workHours <= 0) return log.hourlyRate || 0;
            const roleId = log?.role?._id?.toString?.() || log?.role?.toString?.();
            if (!roleId) return log.hourlyRate || 0;

            const sc = await SalaryComponent.findOne({ personnelRole: roleId });
            if (!sc) return log.hourlyRate || 0;

            // Prefer activity date over updatedAt
            const baseVal = daDate || log?.updatedAt || Date.now();
            const base = (typeof baseVal === 'string' && /^\d+$/.test(baseVal)) ? Number(baseVal) : baseVal;
            const dateObj = new Date(base);

            const day = dateObj.getDay();
            const isSunday = day === 0;
            const isWeekend = day === 0 || day === 6;
            const startOfDay = new Date(dateObj);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
            const holidayDoc = await Holiday.findOne({ date: { $gte: startOfDay, $lt: endOfDay } });
            const isHoliday = !!holidayDoc || isSunday;

            let dayType = 'normal';
            if (isHoliday) dayType = 'libur';
            else if (isWeekend) dayType = 'weekend';

            const ot = await OvertimeRate.findOne({ waktuKerja: workHours });
            if (!ot) return log.hourlyRate || 0;

            let multiplier = 0;
            if (dayType === 'normal') multiplier = ot.normal;
            else if (dayType === 'weekend') multiplier = ot.weekend;
            else if (dayType === 'libur') multiplier = ot.libur;

            const hourlyBase = (sc.gajiPokok || 0) / 173;
            const upahLemburHarian = Math.round(hourlyBase * multiplier);
            const salaryDetail = sc.hitungKomponenGaji(dateObj);
            const manpowerHarian = (salaryDetail.biayaMPTetapHarian || 0) + upahLemburHarian;
            return manpowerHarian / 8;
          } catch (_) {
            return log.hourlyRate || 0;
          }
        }

        for (const log of manpowerLogs) {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === log.dailyActivityId.toString());
          if (!dailyActivity) return;
          // Skip if SPK doesn't have spkNo (cacad)
          const spkIdStr = dailyActivity.spkId ? dailyActivity.spkId.toString() : null;
          const spkMeta = spkIdStr ? spkMetaById.get(spkIdStr) : null;
          if (!spkMeta || !spkMeta.spkNo) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = ensureMonthlyEntry(year, month);
          
          const computedHourly = await computeHourlyFromCost(log, dailyActivity.date);
          const cost = (log.personCount || 0) * (log.workingHours || 0) * computedHourly;
          monthlyData[key].cost += cost;
          monthlyData[key].costBreakdown.manpower += cost;
        }
        
        equipmentLogs.forEach(log => {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === log.dailyActivityId.toString());
          if (!dailyActivity) return;
          // Skip if SPK doesn't have spkNo (cacad)
          const spkIdStr = dailyActivity.spkId ? dailyActivity.spkId.toString() : null;
          const spkMeta = spkIdStr ? spkMetaById.get(spkIdStr) : null;
          if (!spkMeta || !spkMeta.spkNo) return;
          
          const year = dailyActivity.date.getFullYear();
          const month = dailyActivity.date.getMonth() + 1;
          const key = ensureMonthlyEntry(year, month);
          
          // Fuel cost uses fuelIn * effective fuel price
          const fuelCost = (log.fuelIn || 0) * getEffectiveFuelPrice(log);
          // Rental uses rentalRatePerDay only (no hourly fallback)
          let rentalCost = 0;
          if (log.rentalRatePerDay && log.rentalRatePerDay > 0) {
            const workingHour = (log.workingHour || log.workingHours || 0);
            const days = workingHour >= 8 ? 1 : workingHour / 8;
            rentalCost = days * log.rentalRatePerDay;
          }
          const cost = fuelCost + rentalCost;
          monthlyData[key].cost += cost;
          monthlyData[key].costBreakdown.equipment += cost;
        });
        
        otherCosts.forEach(cost => {
          const dailyActivity = dailyActivities.find(da => da._id.toString() === cost.dailyActivityId.toString());
          if (!dailyActivity) return;
          // Skip if SPK doesn't have spkNo (cacad)
          const spkIdStr = dailyActivity.spkId ? dailyActivity.spkId.toString() : null;
          const spkMeta = spkIdStr ? spkMetaById.get(spkIdStr) : null;
          if (!spkMeta || !spkMeta.spkNo) return;
          
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
        // Also keep per-SPK breakdown per month
        const activityMonthlySalesBySpk = {};
        // And keep per-activity-detail breakdown per month
        const activityMonthlyDetails = {};
        for (const detail of allActivityDetails) {
          const daId = detail.dailyActivityId?.toString();
          const da = daMap.get(daId);
          if (!da) continue;
          const spkIdStr = da.spkId?.toString();
          if (!spkIdStr) continue;
          // Skip if SPK doesn't have spkNo (cacad)
          const meta = spkMetaById.get(spkIdStr);
          if (!meta || !meta.spkNo) continue;

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

          // Breakdown per SPK
          if (!activityMonthlySalesBySpk[key]) activityMonthlySalesBySpk[key] = {};
          if (!activityMonthlySalesBySpk[key][spkIdStr]) activityMonthlySalesBySpk[key][spkIdStr] = 0;
          activityMonthlySalesBySpk[key][spkIdStr] += amount;

          // Breakdown per Activity Detail
          if (!activityMonthlyDetails[key]) activityMonthlyDetails[key] = [];
          activityMonthlyDetails[key].push({
            dailyActivityId: daId,
            date: da.date,
            spkId: spkIdStr,
            spkNo: spkMetaById.get(spkIdStr)?.spkNo || null,
            title: spkMetaById.get(spkIdStr)?.title || null,
            workItemId: workItemIdStr,
            workItemName: detail.workItemId?.name || null,
            nrQty,
            rQty,
            nrRate,
            rRate,
            amount
          });
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
          const spkMaterialCost = spk.spkNo
            ? spkMaterialLogs.reduce((total, log) => 
                total + ((log.quantity || 0) * (log.unitRate || log.materialId?.unitRate || 0)), 0)
            : 0;

          const spkManpowerCost = spk.spkNo
            ? (await Promise.all(spkManpowerLogs.map(async (log) => {
                const da = daMap.get(log.dailyActivityId.toString());
                const computedHourly = await computeHourlyFromCost(log, da?.date);
                return (log.personCount || 0) * (log.workingHours || 0) * computedHourly;
              }))).reduce((a, b) => a + b, 0)
            : 0;

          const spkEquipmentCost = spk.spkNo
            ? spkEquipmentLogs.reduce((total, log) => {
                // Fuel cost uses fuelIn * effective fuel price (align with requirement)
                const fuelCost = (log.fuelIn || 0) * getEffectiveFuelPrice(log);
                // Menggunakan rentalRatePerDay, dengan perhitungan yang sama seperti di atas
                let rentalCost = 0;
                if (log.rentalRatePerDay && log.rentalRatePerDay > 0) {
                  const workingHour = (log.workingHour || log.workingHours || 0);
                  const days = workingHour >= 8 ? 1 : workingHour / 8;
                  rentalCost = days * log.rentalRatePerDay;
                }
                return total + fuelCost + rentalCost;
              }, 0)
            : 0;

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
          const workItemCompletionPercentage = spk.spkNo ? boqProgressPercentage : 0;
          const budgetUtilizationPercentage = spkBudget > 0 ? (spkTotalActualCost / spkBudget) * 100 : 0;
          
          // PlannedVsActualCostRatio langsung menggunakan nilai boqProgressPercentage
          // (mengabaikan perhitungan biaya sesuai permintaan)
          const plannedVsActualCostRatio = boqProgressPercentage;

          // Executed sales amount: sum(actual NR * NR rate + actual R * R rate) using SPK-local rates
          let executedSalesAmount = 0;
          const wiRateMapForSpk = spkRatesMap.get(spkId);
          if (spk.spkNo) {
            for (const detail of activityDetails) {
              const workItemIdStr = detail.workItemId?._id?.toString?.() || detail.workItemId?.toString();
              if (!workItemIdStr) continue;
              const rates = wiRateMapForSpk ? wiRateMapForSpk.get(workItemIdStr) : undefined;
              const nrRate = rates?.nrRate || 0;
              const rRate = rates?.rRate || 0;
              const nrQty = detail.actualQuantity?.nr || 0;
              const rQty = detail.actualQuantity?.r || 0;
              executedSalesAmount += (nrQty * nrRate) + (rQty * rRate);
            }
          }
          // New progress formula requested: executed sales / SPK budget * 100
          const progressPercentageBySales = spk.spkNo && spkBudget > 0 ? (executedSalesAmount / spkBudget) * 100 : 0;
          
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
            progressPercentage: progressPercentageBySales,
            activityCount: spkActivities.length,
            // New fields for enhanced financial metrics
            totalProgress: {
              // Sales-based percentage to align with spkWithProgressBySpkId
              percentage: spkBudget > 0 ? Math.round((executedSalesAmount / spkBudget) * 10000) / 100 : 0,
              totalBudget: spkBudget,
              totalSpent: spkTotalActualCost,
              remainingBudget: spkRemainingBudget,
              totalSales: executedSalesAmount,
              budgetUtilizationPercentage: Math.round(budgetUtilizationPercentage * 100) / 100,
              plannedVsActualCostRatio: Math.round(plannedVsActualCostRatio * 100) / 100,
              totalPlannedCost: spkTotalPlannedCost,
              isOverBudget: spkTotalActualCost > spkBudget,
              costBreakdown: costBreakdown
            }
          };
        }));

        // Chart data - Cost Breakdown (Total cost per kategori)
        // Build valid logs for all cost types (skip SPK without spkNo)
        const validMaterialLogs = materialLogs.filter(log => {
          const daId = log.dailyActivityId ? log.dailyActivityId.toString() : null;
          const da = daId ? daMap.get(daId) : null;
          const spkIdStr = da?.spkId ? da.spkId.toString() : null;
          const spkMeta = spkIdStr ? spkMetaById.get(spkIdStr) : null;
          return !!(spkMeta && spkMeta.spkNo);
        });
        const totalMaterialCost = validMaterialLogs.reduce((total, log) => 
          total + ((log.quantity || 0) * (log.unitRate || log.materialId?.unitRate || 0)), 0);

        // Filter manpower logs: abaikan SPK tanpa spkNo (cacad)
        const validManpowerLogs = manpowerLogs.filter(log => {
          const daId = log.dailyActivityId ? log.dailyActivityId.toString() : null;
          const da = daId ? daMap.get(daId) : null;
          const spkIdStr = da?.spkId ? da.spkId.toString() : null;
          const spkMeta = spkIdStr ? spkMetaById.get(spkIdStr) : null;
          const hasSpkNo = !!(spkMeta && spkMeta.spkNo);
          return hasSpkNo;
        });

        const totalManpowerCost = (await Promise.all(validManpowerLogs.map(async (log) => {
          const daId = log.dailyActivityId ? log.dailyActivityId.toString() : null;
          const da = daId ? daMap.get(daId) : null;
          const computedHourly = await computeHourlyFromCost(log, da?.date);
          return (log.personCount || 0) * (log.workingHours || 0) * computedHourly;
        }))).reduce((a, b) => a + b, 0);

        // Debug: Tampilkan rincian biaya manpower per log dan totalnya
        try {
          console.log('[ManpowerCost Breakdown]');
          validManpowerLogs.forEach((log, idx) => {
            const personCount = log.personCount || 0;
            const computedHourly = 0; // to keep logging lightweight; can compute if needed
            const hourlyRate = log.hourlyRate || 0;
            const workingHours = log.workingHours || 0;
            const lineTotal = personCount * hourlyRate * workingHours;
            // Resolve SPK ID via DailyActivity map
            const daId = log.dailyActivityId ? log.dailyActivityId.toString() : null;
            const da = daId ? daMap.get(daId) : null;
            const spkIdStr = da?.spkId ? da.spkId.toString() : null;
            const spkNo = spkIdStr ? (spkMetaById.get(spkIdStr)?.spkNo || spkIdStr) : 'N/A';
            console.log(`  #${idx + 1} spkNo=${spkNo} personCount=${personCount}, hourlyRate=${hourlyRate}, workingHours=${workingHours} => lineTotal=${lineTotal}`);
          });
          const skipped = manpowerLogs.length - validManpowerLogs.length;
          if (skipped > 0) {
            console.log(`[ManpowerCost Skipped] ${skipped} log(s) diabaikan karena SPK tanpa spkNo`);
          }
          console.log(`[ManpowerCost Total] totalManpowerCost=${totalManpowerCost}`);
        } catch (e) {
          // Pastikan tidak mengganggu eksekusi utama jika logging gagal
          console.warn('ManpowerCost logging failed:', e?.message || e);
        }

        // Split equipment costs into fuel and rental
        const validEquipmentLogs = equipmentLogs.filter(log => {
          const daId = log.dailyActivityId ? log.dailyActivityId.toString() : null;
          const da = daId ? daMap.get(daId) : null;
          const spkIdStr = da?.spkId ? da.spkId.toString() : null;
          const spkMeta = spkIdStr ? spkMetaById.get(spkIdStr) : null;
          return !!(spkMeta && spkMeta.spkNo);
        });
        const totalEquipmentFuelCost = validEquipmentLogs.reduce((total, log) => 
          total + ((log.fuelIn || 0) * getEffectiveFuelPrice(log)), 0);
        // Menggunakan rentalRatePerDay, jika workingHour >= 8 jam berarti satu hari penuh
        const totalEquipmentRentalCost = validEquipmentLogs.reduce((total, log) => {
          // Jika ada rentalRatePerDay, gunakan itu
          if (log.rentalRatePerDay && log.rentalRatePerDay > 0) {
            // Hitung berapa hari kerja berdasarkan workingHour
            const workingHour = (log.workingHour || log.workingHours || 0);
            const days = workingHour >= 8 ? 1 : workingHour / 8; // 8 jam = 1 hari kerja
            return total + (days * log.rentalRatePerDay);
          }
          return total;
        }, 0);
        const totalEquipmentCost = totalEquipmentFuelCost + totalEquipmentRentalCost;

        // Other costs: total and breakdown by costType
        const validOtherCosts = otherCosts.filter(c => {
          const daId = c.dailyActivityId ? c.dailyActivityId.toString() : null;
          const da = daId ? daMap.get(daId) : null;
          const spkIdStr = da?.spkId ? da.spkId.toString() : null;
          const spkMeta = spkIdStr ? spkMetaById.get(spkIdStr) : null;
          return !!(spkMeta && spkMeta.spkNo);
        });
        const totalOtherCost = validOtherCosts.reduce((total, cost) => total + (cost.amount || 0), 0);
        const otherBreakdownMap = {};
        validOtherCosts.forEach(c => {
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
              date: { $gte: oneYearAgo },
              spkNo: { $nin: [null, ''] }
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
          .map(item => {
            const key = `${item.year}-${item.month}`;
            const perSpkMap = activityMonthlySalesBySpk[key] || {};
            const perSpk = Object.entries(perSpkMap)
              .map(([spkId, amt]) => ({
                spkId,
                spkNo: spkMetaById.get(spkId)?.spkNo || null,
                title: spkMetaById.get(spkId)?.title || null,
                amount: amt
              }))
              .sort((a, b) => b.amount - a.amount);
            const activityDetails = (activityMonthlyDetails[key] || [])
              .map(d => ({
                dailyActivityId: d.dailyActivityId,
                date: d.date?.toISOString?.() || (d.date ? String(d.date) : null),
                spkId: d.spkId,
                spkNo: d.spkNo,
                title: d.title,
                workItemId: d.workItemId,
                workItemName: d.workItemName,
                nrQty: d.nrQty,
                rQty: d.rQty,
                nrRate: d.nrRate,
                rRate: d.rRate,
                amount: d.amount
              }))
              .sort((a, b) => b.amount - a.amount);
            return {
              year: item.year,
              month: item.month,
              monthName: getMonthName(item.month),
              amount: item.sales,
              totalSales: item.sales,
              spkCount: perSpk.length,
              perSpk,
              activityDetails
            };
          });
        
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