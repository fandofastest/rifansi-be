const userResolvers = require('./userResolvers');
const categoryResolvers = require('./categoryResolvers');
const contractResolvers = require('./contractResolvers');
const equipmentResolvers = require('./equipmentResolvers');
const materialResolvers = require('./materialResolvers');
const spkResolvers = require('./spkResolvers');
const dailyActivityResolvers = require('./dailyActivityResolvers');
const areaResolvers = require('./areaResolvers');
const personnelRoleResolvers = require('./personnelRoleResolvers');
const salaryComponentResolvers = require('./salaryComponentResolvers');
const holidayResolvers = require('./holidayResolvers');
const fuelPriceResolvers = require('./fuelPriceResolvers');
const overtimeRateResolvers = require('./overtimeRateResolvers');
const workItemResolvers = require('./workItemResolvers');
const unitResolvers = require('./unitResolvers');
const approverSettingResolvers = require('./approverSettingResolvers');
const backupResolvers = require('./backupResolvers');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

// Helper functions
const {
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
    processHolidaysImport
} = require('./helpers');

// Merge all resolvers
const resolvers = {
    Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        parseValue(value) {
            return new Date(value); // value from the client
        },
        serialize(value) {
            return value.getTime(); // value sent to the client
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return new Date(parseInt(ast.value, 10)); // ast value is always in string format
            }
            return null;
        },
    }),
    Query: {
        ...userResolvers.Query,
        ...categoryResolvers.Query,
        ...contractResolvers.Query,
        ...equipmentResolvers.Query,
        ...materialResolvers.Query,
        ...spkResolvers.Query,
        ...dailyActivityResolvers.Query,
        ...areaResolvers.Query,
        ...personnelRoleResolvers.Query,
        ...salaryComponentResolvers.Query,
        ...holidayResolvers.Query,
        ...fuelPriceResolvers.Query,
        ...overtimeRateResolvers.Query,
        ...workItemResolvers.Query,
        ...unitResolvers.Query,
        ...approverSettingResolvers.Query,
        ...backupResolvers.Query
    },
    Mutation: {
        ...userResolvers.Mutation,
        ...categoryResolvers.Mutation,
        ...contractResolvers.Mutation,
        ...equipmentResolvers.Mutation,
        ...materialResolvers.Mutation,
        ...spkResolvers.Mutation,
        ...dailyActivityResolvers.Mutation,
        ...areaResolvers.Mutation,
        ...personnelRoleResolvers.Mutation,
        ...salaryComponentResolvers.Mutation,
        ...holidayResolvers.Mutation,
        ...fuelPriceResolvers.Mutation,
        ...overtimeRateResolvers.Mutation,
        ...workItemResolvers.Mutation,
        ...unitResolvers.Mutation,
        ...approverSettingResolvers.Mutation,
        ...backupResolvers.Mutation
    },
    // Type Resolvers
    Category: categoryResolvers.Category,
    SubCategory: categoryResolvers.SubCategory,
    Material: materialResolvers.Material,
    Unit: unitResolvers.Unit,
    Equipment: equipmentResolvers.Equipment,
    EquipmentContract: equipmentResolvers.EquipmentContract,
    WorkItem: workItemResolvers.WorkItem,
    DailyActivity: dailyActivityResolvers.DailyActivity,
    ActivityDetail: dailyActivityResolvers.ActivityDetail,
    EquipmentLog: dailyActivityResolvers.EquipmentLog,
    ManpowerLog: dailyActivityResolvers.ManpowerLog,
    MaterialUsageLog: dailyActivityResolvers.MaterialUsageLog,
    SPK: spkResolvers.SPK,
    SPKWorkItem: spkResolvers.SPKWorkItem,
    AuthPayload: userResolvers.AuthPayload,
    User: userResolvers.User,
    OtherCost: dailyActivityResolvers.OtherCost,
    PersonnelRole: personnelRoleResolvers.PersonnelRole,
    SalaryComponent: salaryComponentResolvers.SalaryComponent,
    Holiday: holidayResolvers.Holiday,
    ApproverSetting: approverSettingResolvers.ApproverSetting
};

module.exports = resolvers; 