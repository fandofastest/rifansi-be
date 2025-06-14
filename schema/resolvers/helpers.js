const { Holiday } = require('../../models');

function calculatePhysicalProgress(dailyActivities) {
    let totalActual = 0;

    dailyActivities.forEach(activity => {
        activity.activityDetails.forEach(detail => {
            totalActual += (detail.actualQuantity.nr || 0) + (detail.actualQuantity.r || 0);
        });
    });

    return totalActual;
}

function calculateFinancialProgress(dailyActivities) {
    const totalCost = calculateCosts(dailyActivities).total;
    const totalBudget = dailyActivities[0]?.spkId?.totalBudget || 0;
    return totalBudget > 0 ? (totalCost / totalBudget) * 100 : 0;
}

function calculateCosts(dailyActivities) {
    let equipmentCost = 0;
    let manpowerCost = 0;
    let materialCost = 0;

    dailyActivities.forEach(activity => {
        activity.equipmentLogs.forEach(log => {
            equipmentCost += log.fuelIn * log.fuelPrice;
        });

        activity.manpowerLogs.forEach(log => {
            manpowerCost += log.personCount * log.workingHours * log.hourlyRate;
        });

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

function calculateDailyPhysicalProgress(activityDetails, spk) {
    if (!spk || !spk.workItems || spk.workItems.length === 0) {
        return 0;
    }

    let totalWeightedProgress = 0;
    let totalWeight = 0;

    // Hitung progress untuk setiap work item
    activityDetails.forEach(detail => {
        // Cari work item yang sesuai di SPK
        const workItem = spk.workItems.find(wi =>
            wi.workItemId.toString() === detail.workItemId.toString()
        );

        if (workItem) {
            // Bobot work item berdasarkan nilai amount
            const weight = workItem.amount || 0;

            // Hitung persentase progress
            const totalPlanned = (workItem.boqVolume.nr || 0) + (workItem.boqVolume.r || 0);
            const totalActual = (detail.actualQuantity.nr || 0) + (detail.actualQuantity.r || 0);
            const percentageComplete = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

            // Tambahkan ke total weighted progress
            totalWeightedProgress += (percentageComplete * weight);
            totalWeight += weight;
        }
    });

    // Hitung rata-rata tertimbang progress
    return totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
}

function calculateDailyFinancialProgress(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts = []) {
    const costs = calculateDailyCosts(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts);
    const totalBudget = 0;
    return totalBudget > 0 ? (costs.total / totalBudget) * 100 : 0;
}

function calculateDailyCosts(equipmentLogs, manpowerLogs, materialUsageLogs, otherCosts = []) {
    let equipmentCost = 0;
    let manpowerCost = 0;
    let materialCost = 0;
    let otherCost = 0;

    if (Array.isArray(equipmentLogs)) {
        equipmentCost = equipmentLogs.reduce((sum, log) => {
            const fuelUsed = ((log.fuelIn || 0) - (log.fuelRemaining || 0));
            const fuelCost = fuelUsed * (log.fuelPrice || 0);
            const rentalCost = (log.workingHour || 0) * (log.hourlyRate || 0);
            return sum + (isNaN(fuelCost) ? 0 : fuelCost) + (isNaN(rentalCost) ? 0 : rentalCost);
        }, 0);
    }

    if (Array.isArray(manpowerLogs)) {
        manpowerCost = manpowerLogs.reduce((sum, log) => {
            const cost = (log.personCount || 0) * (log.hourlyRate || 0) * (log.workingHours || 0);
            return sum + (isNaN(cost) ? 0 : cost);
        }, 0);
    }

    if (Array.isArray(materialUsageLogs)) {
        materialCost = materialUsageLogs.reduce((sum, log) => {
            const cost = (log.quantity || 0) * (log.unitRate || 0);
            return sum + (isNaN(cost) ? 0 : cost);
        }, 0);
    }

    if (Array.isArray(otherCosts)) {
        otherCost = otherCosts.reduce((sum, cost) => {
            return sum + (isNaN(cost.amount) ? 0 : (cost.amount || 0));
        }, 0);
    }

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

function calculateProgressPercentage(activityDetails, spk) {
    if (!spk || !spk.workItems || !spk.startDate || !spk.endDate) {
        return 0;
    }

    const startDate = new Date(parseInt(spk.startDate));
    const endDate = new Date(parseInt(spk.endDate));
    const totalWorkDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

    const totalBoqVolume = spk.workItems.reduce((total, item) => {
        return total + (item.boqVolume.nr + item.boqVolume.r);
    }, 0);

    const dailyTarget = totalBoqVolume / totalWorkDays;

    const totalActualVolume = activityDetails.reduce((total, detail) => {
        const actualVolume = detail.actualQuantity.nr + detail.actualQuantity.r;
        return total + actualVolume;
    }, 0);

    const progressPercentage = (dailyTarget > 0) ? (totalActualVolume / dailyTarget) * 100 : 0;

    return progressPercentage;
}

async function processHolidaysImport(holidaysData, userId) {
    let importedCount = 0;
    let skippedCount = 0;
    let errors = [];

    for (const holiday of holidaysData) {
        try {
            const holidayDate = holiday.holiday_date || holiday.date;
            const holidayName = holiday.holiday_name || holiday.name;
            const isNational = holiday.is_national_holiday !== undefined ?
                holiday.is_national_holiday :
                (holiday.isNational !== undefined ? holiday.isNational : true);

            if (!holidayDate || !holidayName) {
                skippedCount++;
                errors.push(`Invalid data: missing required fields for holiday`);
                continue;
            }

            const parsedDate = new Date(holidayDate);
            if (isNaN(parsedDate.getTime())) {
                skippedCount++;
                errors.push(`Invalid date format: ${holidayDate}`);
                continue;
            }

            parsedDate.setHours(0, 0, 0, 0);

            const existingHoliday = await Holiday.findOne({
                date: {
                    $gte: parsedDate,
                    $lt: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000)
                }
            });

            if (existingHoliday) {
                existingHoliday.name = holidayName;
                existingHoliday.isNational = isNational;
                await existingHoliday.save();
                importedCount++;
            } else {
                const newHoliday = new Holiday({
                    date: parsedDate,
                    name: holidayName,
                    isNational: isNational,
                    createdBy: userId
                });
                await newHoliday.save();
                importedCount++;
            }
        } catch (error) {
            skippedCount++;
            errors.push(`Error processing holiday: ${error.message}`);
        }
    }

    return {
        success: importedCount > 0,
        message: errors.length > 0 ? `Imported with some errors: ${errors.join('; ')}` : `Successfully imported ${importedCount} holidays`,
        importedCount,
        skippedCount
    };
}

/**
 * Calculate progress percentage based on BOQ (Bill of Quantity) completion
 * @param {Array} activityDetails - Array of activity details with workItem and actual quantities
 * @param {Object} spk - SPK object with workItems containing BOQ volumes
 * @returns {Number} Average progress percentage from all work items
 */
function calculateBOQProgressPercentage(activityDetails, spk) {
    if (!activityDetails || activityDetails.length === 0) {
        return 0;
    }

    let totalProgressSum = 0;
    let validItemsCount = 0;

    activityDetails.forEach(detail => {
        if (detail.workItemId && detail.actualQuantity) {
            // Find matching work item in SPK to get BOQ target
            const spkWorkItem = spk.workItems?.find(item =>
                item.workItemId.toString() === (detail.workItemId._id || detail.workItemId).toString()
            );

            if (spkWorkItem && spkWorkItem.boqVolume) {
                const targetNr = spkWorkItem.boqVolume.nr || 0;
                const targetR = spkWorkItem.boqVolume.r || 0;
                const totalTarget = targetNr + targetR;

                const actualNr = detail.actualQuantity.nr || 0;
                const actualR = detail.actualQuantity.r || 0;
                const totalActual = actualNr + actualR;

                if (totalTarget > 0) {
                    const itemProgress = Math.min((totalActual / totalTarget) * 100, 100);
                    totalProgressSum += itemProgress;
                    validItemsCount++;

                    console.log(`[BOQ Progress Helper] Work Item: ${detail.workItemId.name || detail.workItemId}`);
                    console.log(`  Target: ${targetNr} + ${targetR} = ${totalTarget}`);
                    console.log(`  Actual: ${actualNr} + ${actualR} = ${totalActual}`);
                    console.log(`  Item Progress: ${itemProgress.toFixed(2)}%`);
                }
            }
        }
    });

    // Calculate average progress percentage from all work items
    const avgProgress = validItemsCount > 0 ? totalProgressSum / validItemsCount : 0;
    console.log(`[BOQ Progress Helper] Total: ${totalProgressSum.toFixed(2)}% / ${validItemsCount} items = ${avgProgress.toFixed(2)}%`);

    return avgProgress;
}

/**
 * Calculate budget usage percentage based on daily target
 * @param {Array} activityDetails - Array of activity details with workItem and actual quantities
 * @param {Object} spk - SPK object with budget and dates
 * @returns {Number} Budget usage percentage for the day
 */
function calculateBudgetUsagePercentage(activityDetails, spk) {
    if (!activityDetails || activityDetails.length === 0 || !spk) {
        return 0;
    }

    // Calculate daily target
    let targetHarian = 0;
    let totalHariKerja = 1;

    if (spk.startDate && spk.endDate) {
        const start = new Date(spk.startDate);
        const end = new Date(spk.endDate);
        totalHariKerja = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    }

    const totalBudget = spk.budget || 0;
    targetHarian = totalBudget / totalHariKerja;

    // Calculate total cost from activity details
    let totalBiayaItemwork = 0;

    activityDetails.forEach(detail => {
        if (detail.workItemId && detail.actualQuantity) {
            const rates = detail.workItemId.rates || { nr: { rate: 0 }, r: { rate: 0 } };
            const qtyNr = detail.actualQuantity.nr || 0;
            const qtyR = detail.actualQuantity.r || 0;
            const rateNr = rates.nr?.rate || 0;
            const rateR = rates.r?.rate || 0;
            const biaya = (qtyNr * rateNr) + (qtyR * rateR);
            totalBiayaItemwork += biaya;
        }
    });

    // Calculate budget usage percentage
    const budgetUsage = targetHarian > 0 ? (totalBiayaItemwork / targetHarian) * 100 : 0;
    console.log(`[Budget Usage Helper] ${totalBiayaItemwork.toLocaleString()} / ${targetHarian.toLocaleString()} = ${budgetUsage.toFixed(2)}%`);

    return budgetUsage;
}

module.exports = {
    calculatePhysicalProgress,
    calculateFinancialProgress,
    calculateCosts,
    calculateWorkItemsProgress,
    calculateDailyPhysicalProgress,
    calculateDailyFinancialProgress,
    calculateDailyCosts,
    getWeekDates,
    getMonthDates,
    calculateProgressPercentage,
    processHolidaysImport,
    calculateBOQProgressPercentage,
    calculateBudgetUsagePercentage
}; 