const { gql } = require('graphql-tag');

const typeDefs = gql`
  # User
  type User {
    id: ID!
    username: String!
    fullName: String!
    role: PersonnelRole!
    email: String!
    phone: String
    isActive: Boolean
    lastLogin: String
    createdAt: String!
    updatedAt: String!
  }

  # Contract
  type Contract {
    id: ID!
    contractNo: String!
    description: String
    startDate: String
    endDate: String
    vendorName: String
    createdAt: String!
    updatedAt: String!
  }

  # Category
  type Category {
    id: ID!
    code: String!
    name: String!
    description: String
    createdAt: String!
    updatedAt: String!
    subCategories: [SubCategory!]!
  }

  # SubCategory
  type SubCategory {
    id: ID!
    categoryId: ID!
    name: String!
    description: String
    category: Category
    createdAt: String!
    updatedAt: String!
  }

  # Unit
  type Unit {
    id: ID!
    code: String!
    name: String!
    description: String
  }

  # Material
  type Material {
    id: ID!
    name: String!
    unitId: ID!
    unitRate: Float!
    description: String
    unit: Unit
  }

  # Equipment
  type Equipment {
    id: ID!
    equipmentCode: String!
    plateOrSerialNo: String
    equipmentType: String!
    defaultOperator: String
    area: String
    fuelType: String
    year: Int
    serviceStatus: String!
    contracts: [EquipmentContract!]
    description: String
    createdAt: String!
    updatedAt: String!
  }

  type EquipmentContract {
    contractId: ID!
    equipmentId: Int!
    rentalRate: Float!
    contract: Contract
  }

  # PersonnelRole
  type PersonnelRole {
    id: ID!
    roleCode: String!
    roleName: String!
    hourlyRate: Float!
    description: String
    createdAt: String
    updatedAt: String
  }

  # FuelPrice
  type FuelPrice {
    id: ID!
    fuelType: String!
    pricePerLiter: Float!
    effectiveDate: String!
    description: String
  }

  # Area
  type Area {
    id: ID!
    name: String!
    location: Location!
    createdAt: String!
    updatedAt: String!
  }

  type Location {
    type: String!
    coordinates: [Float!]!
  }

  # SPK
  type SPK {
    id: ID!
    spkNo: String!
    wapNo: String!
    title: String!
    projectName: String!
    date: String!
    contractor: String!
    workDescription: String!
    location: Area
    startDate: String
    endDate: String
    budget: Float!
    workItems: [SPKWorkItem!]
    createdAt: String!
    updatedAt: String!
  }

  type SPKWorkItem {
    workItemId: ID!
    boqVolume: WorkItemVolume!
    amount: Float!
    rates: WorkItemRates!
    description: String
    workItem: WorkItem
  }

  type WorkItemVolume {
    nr: Float!
    r: Float!
  }

  input WorkItemVolumeInput {
    nr: Float!
    r: Float!
  }

  # WorkItem
  type WorkItem {
    id: ID!
    name: String!
    categoryId: ID
    subCategoryId: ID
    unitId: ID
    rates: WorkItemRates!
    description: String
    category: Category
    subCategory: SubCategory
    unit: Unit
    createdAt: String!
    updatedAt: String!
  }

  # DailyActivity
  type DailyActivity {
    id: ID!
    spkId: ID!
    contractId: ID!
    date: String!
    location: String
    weather: String
    status: String!
    workStartTime: String
    workEndTime: String
    createdBy: ID!
    closingRemarks: String
    createdAt: String!
    updatedAt: String!
    spk: SPK
    user: User
  }

  # ActivityDetail
  type ActivityDetail {
    id: ID!
    dailyActivityId: ID!
    workItemId: ID!
    actualQuantity: WorkItemVolume!
    remarks: String
    status: String!
    progressPercentage: Float
    dailyActivity: DailyActivity
    workItem: WorkItem
  }

  type ManpowerPlan {
    role: PersonnelRole
    quantity: Int
  }

  type MaterialPlan {
    materialId: Material
    quantity: Float
  }

  # EquipmentLog
  type EquipmentLog {
    id: ID!
    dailyActivityId: ID!
    equipmentId: ID!
    fuelIn: Float
    fuelRemaining: Float
    workingHour: Float
    isBrokenReported: Boolean!
    remarks: String
    dailyActivity: DailyActivity
    equipment: Equipment
  }

  # ManpowerLog
  type ManpowerLog {
    id: ID!
    dailyActivityId: ID!
    role: ID!
    personCount: Int!
    normalHoursPerPerson: Float
    normalHourlyRate: Float!
    overtimeHourlyRate: Float!
    dailyActivity: DailyActivity
    personnelRole: PersonnelRole
  }

  # MaterialUsageLog
  type MaterialUsageLog {
    id: ID!
    dailyActivityId: ID!
    materialId: ID!
    quantity: Float
    unitRate: Float
    remarks: String
    dailyActivity: DailyActivity
    material: Material
  }

  # Auth
  type AuthPayload {
    token: String!
    user: User!
  }

  # Queries
  type Query {
    # User
    me: User
    users: [User!]!
    user(id: ID!): User

    # Contract
    contracts: [Contract!]!
    contract(id: ID!): Contract

    # Category
    categories: [Category!]!
    category(id: ID!): Category

    # SubCategory
    subCategories: [SubCategory!]!
    subCategory(id: ID!): SubCategory
    subCategoriesByCategory(categoryId: ID!): [SubCategory!]!

    # Unit
    units: [Unit!]!
    unit(id: ID!): Unit

    # Material
    materials: [Material!]!
    material(id: ID!): Material

    # Equipment
    equipments: [Equipment!]!
    equipment(id: ID!): Equipment
    equipmentsByStatus(status: String!): [Equipment!]!

    # PersonnelRole
    personnelRoles: [PersonnelRole!]!
    personnelRole(id: ID!): PersonnelRole

    # FuelPrice
    fuelPrices: [FuelPrice!]!
    fuelPrice(id: ID!): FuelPrice
    currentFuelPrice(fuelType: String!): FuelPrice

    # Area
    areas: [Area!]!
    area(id: ID!): Area
    areasNearby(latitude: Float!, longitude: Float!, maxDistance: Float!): [Area!]!

    # SPK
    spks(startDate: String, endDate: String, locationId: ID, keyword: String): [SPK!]!
    spk(id: ID!): SPK

    # WorkItem
    workItems: [WorkItem!]!
    workItem(id: ID!): WorkItem
    workItemsBySPK(spkId: ID!): [WorkItem!]!

    # DailyActivity
    dailyActivities: [DailyActivity!]!
    dailyActivity(id: ID!): DailyActivity
    dailyActivitiesBySPK(spkId: ID!): [DailyActivity!]!
    dailyActivitiesByDate(date: String!): [DailyActivity!]!

    # ActivityDetail
    activityDetails: [ActivityDetail!]!
    activityDetail(id: ID!): ActivityDetail
    activityDetailsByDailyActivity(dailyActivityId: ID!): [ActivityDetail!]!

    # EquipmentLog
    equipmentLogs: [EquipmentLog!]!
    equipmentLog(id: ID!): EquipmentLog
    equipmentLogsByDailyActivity(dailyActivityId: ID!): [EquipmentLog!]!

    # ManpowerLog
    manpowerLogs: [ManpowerLog!]!
    manpowerLog(id: ID!): ManpowerLog
    manpowerLogsByDailyActivity(dailyActivityId: ID!): [ManpowerLog!]!

    # MaterialUsageLog
    materialUsageLogs: [MaterialUsageLog!]!
    materialUsageLog(id: ID!): MaterialUsageLog
    materialUsageLogsByDailyActivity(dailyActivityId: ID!): [MaterialUsageLog!]!

    spkProgress(spkId: ID!, startDate: String!, endDate: String!): SPKProgressResponse
    dailyProgress(spkId: ID!, date: String!): DailyProgressResponse
    weeklyProgress(spkId: ID!, week: Int!, year: Int!): WeeklyProgressResponse
    monthlyProgress(spkId: ID!, month: Int!, year: Int!): MonthlyProgressResponse

    # SPK with Progress
    getSpkWithProgress(id: ID!): SPKWithProgress

    # OtherCost
    otherCosts: [OtherCost!]!
    otherCost(id: ID!): OtherCost
    otherCostsByDailyActivity(dailyActivityId: ID!): [OtherCost!]!
    otherCostsByCostType(costType: String!): [OtherCost!]!
  }

  # Mutations
  type Mutation {
    # Auth
    register(
      username: String!
      password: String!
      fullName: String!
      role: String!
      email: String!
      phone: String
    ): AuthPayload!
    
    login(
      username: String!
      password: String!
    ): AuthPayload!

    # User
    updateUser(
      id: ID!
      username: String
      password: String
      fullName: String
      role: String
      email: String
      phone: String
    ): User!

    deleteUser(id: ID!): Boolean!

    # Contract
    createContract(
      contractNo: String!
      description: String
      startDate: String
      endDate: String
      vendorName: String
    ): Contract!

    updateContract(
      id: ID!
      contractNo: String
      description: String
      startDate: String
      endDate: String
      vendorName: String
    ): Contract!

    deleteContract(id: ID!): Boolean!

    # Category
    createCategory(
      code: String!
      name: String!
      description: String
    ): Category!

    updateCategory(
      id: ID!
      code: String
      name: String
      description: String
    ): Category!

    deleteCategory(id: ID!): Boolean!

    # SubCategory
    createSubCategory(
      categoryId: ID!
      name: String!
      description: String
    ): SubCategory!

    updateSubCategory(
      id: ID!
      categoryId: ID
      name: String
      description: String
    ): SubCategory!

    deleteSubCategory(id: ID!): Boolean!

    # Unit
    createUnit(
      code: String!
      name: String!
      description: String
    ): Unit!

    updateUnit(
      id: ID!
      code: String
      name: String
      description: String
    ): Unit!

    deleteUnit(id: ID!): Boolean!

    # Material
    createMaterial(
      name: String!
      unitId: ID!
      unitRate: Float!
      description: String
    ): Material!

    updateMaterial(
      id: ID!
      name: String
      unitId: ID
      unitRate: Float
      description: String
    ): Material!

    deleteMaterial(id: ID!): Boolean!

    # Equipment
    createEquipment(
      equipmentCode: String!
      plateOrSerialNo: String
      equipmentType: String!
      defaultOperator: String
      area: String
      fuelType: String
      year: Int
      serviceStatus: String
      contracts: [EquipmentContractInput]
      description: String
    ): Equipment!

    updateEquipment(
      id: ID!
      equipmentCode: String
      plateOrSerialNo: String
      equipmentType: String
      defaultOperator: String
      area: String
      fuelType: String
      year: Int
      serviceStatus: String
      contracts: [EquipmentContractInput]
      description: String
    ): Equipment!

    deleteEquipment(id: ID!): Boolean!

    # PersonnelRole
    createPersonnelRole(
      roleCode: String!
      roleName: String!
      hourlyRate: Float!
      description: String
    ): PersonnelRole!

    updatePersonnelRole(
      id: ID!
      roleCode: String
      roleName: String
      hourlyRate: Float
      description: String
    ): PersonnelRole!

    deletePersonnelRole(id: ID!): Boolean!

    # FuelPrice
    createFuelPrice(
      fuelType: String!
      pricePerLiter: Float!
      effectiveDate: String!
      description: String
    ): FuelPrice!

    updateFuelPrice(
      id: ID!
      fuelType: String
      pricePerLiter: Float
      effectiveDate: String
      description: String
    ): FuelPrice!

    deleteFuelPrice(id: ID!): Boolean!

    # SPK
    createSPK(input: CreateSPKInput!): SPK!
    updateSPK(id: ID!, input: UpdateSPKInput!): SPK!
    deleteSPK(id: ID!): Boolean!
    addWorkItemToSPK(spkId: ID!, input: AddWorkItemInput!): SPK!
    removeWorkItemFromSPK(spkId: ID!, workItemId: ID!): SPK!
    updateSPKWorkItem(spkId: ID!, workItemId: ID!, input: UpdateSPKWorkItemInput!): SPK!

    # WorkItem
    createWorkItem(input: CreateWorkItemInput!): WorkItem!
    updateWorkItem(id: ID!, input: UpdateWorkItemInput!): WorkItem!
    deleteWorkItem(id: ID!): Boolean!

    # DailyActivity
    createDailyActivity(
      spkId: ID!
      contractId: ID!
      date: String!
      location: String
      weather: String
      status: String
      workStartTime: String
      workEndTime: String
      createdBy: ID!
      closingRemarks: String
    ): DailyActivity!

    updateDailyActivity(
      id: ID!
      spkId: ID
      contractId: ID
      date: String
      location: String
      weather: String
      status: String
      workStartTime: String
      workEndTime: String
      closingRemarks: String
    ): DailyActivity!

    deleteDailyActivity(id: ID!): Boolean!

    # ActivityDetail
    createActivityDetail(
      dailyActivityId: ID!
      workItemId: ID!
      remarks: String
      status: String
    ): ActivityDetail!

    updateActivityDetail(
      id: ID!
      dailyActivityId: ID
      workItemId: ID
      remarks: String
      status: String
    ): ActivityDetail!

    deleteActivityDetail(id: ID!): Boolean!

    # EquipmentLog
    createEquipmentLog(
      dailyActivityId: ID!
      equipmentId: ID!
      fuelIn: Float!
      fuelRemaining: Float!
      workingHour: Float!
      maintenanceCost: Float
      isBrokenReported: Boolean
      brokenDescription: String
      remarks: String
    ): EquipmentLog!

    updateEquipmentLog(
      id: ID!
      dailyActivityId: ID
      equipmentId: ID
      fuelIn: Float
      fuelRemaining: Float
      workingHour: Float
      isBrokenReported: Boolean
      remarks: String
    ): EquipmentLog!

    deleteEquipmentLog(id: ID!): Boolean!

    # ManpowerLog
    createManpowerLog(
      dailyActivityId: ID!
      role: ID!
      personCount: Int!
      normalHoursPerPerson: Float
      normalHourlyRate: Float!
      overtimeHourlyRate: Float!
    ): ManpowerLog!

    updateManpowerLog(
      id: ID!
      dailyActivityId: ID
      role: ID
      personCount: Int
      normalHoursPerPerson: Float
      normalHourlyRate: Float
      overtimeHourlyRate: Float
    ): ManpowerLog!

    deleteManpowerLog(id: ID!): Boolean!

    # MaterialUsageLog
    createMaterialUsageLog(
      dailyActivityId: ID!
      materialId: ID!
      quantity: Float
      unitRate: Float
      remarks: String
    ): MaterialUsageLog!

    updateMaterialUsageLog(
      id: ID!
      dailyActivityId: ID
      materialId: ID
      quantity: Float
      unitRate: Float
      remarks: String
    ): MaterialUsageLog!

    deleteMaterialUsageLog(id: ID!): Boolean!

    # Area
    createArea(
      name: String!
      latitude: Float!
      longitude: Float!
    ): Area!

    updateArea(
      id: ID!
      name: String
      latitude: Float
      longitude: Float
    ): Area!

    deleteArea(id: ID!): Boolean!

    # Equipment-Contract Relationship Mutations
    addContractToEquipment(equipmentId: ID!, contract: EquipmentContractInput!): Equipment!
    updateEquipmentContract(equipmentId: ID!, contractId: ID!, rentalRate: Float!): Equipment!
    removeContractFromEquipment(equipmentId: ID!, contractId: ID!): Equipment!

    # User self-management
    updateMyProfile(fullName: String, email: String, phone: String): User!
    changeMyPassword(currentPassword: String!, newPassword: String!): PasswordChangeResponse!

    submitDailyReport(input: SubmitDailyReportInput!): DailyReportResponse!

    # OtherCost
    createOtherCost(
      dailyActivityId: ID!
      costType: String!
      amount: Float!
      description: String
      receiptNumber: String
      remarks: String
    ): OtherCost!

    updateOtherCost(
      id: ID!
      dailyActivityId: ID
      costType: String
      amount: Float
      description: String
      receiptNumber: String
      remarks: String
    ): OtherCost!

    deleteOtherCost(id: ID!): Boolean!
  }

  # Input Types
  input ManpowerPlanInput {
    role: ID!
    quantity: Int!
  }

  input MaterialPlanInput {
    materialId: ID!
    quantity: Float!
  }

  input ManpowerUsedInput {
    role: ID!
    quantity: Int!
  }

  input MaterialUsedInput {
    materialId: ID!
    quantity: Float!
  }

  input EquipmentContractInput {
    contractId: ID!
    equipmentId: Int!
    rentalRate: Float!
  }

  input CreateSPKInput {
    spkNo: String!
    wapNo: String!
    title: String!
    projectName: String!
    date: String!
    contractor: String!
    workDescription: String!
    location: ID
    startDate: String
    endDate: String
    budget: Float!
  }

  input UpdateSPKInput {
    spkNo: String
    wapNo: String
    title: String
    projectName: String
    date: String
    contractor: String
    workDescription: String
    location: ID
    startDate: String
    endDate: String
    budget: Float
  }

  input AddWorkItemInput {
    workItemId: ID!
    boqVolume: WorkItemVolumeInput!
    rates: WorkItemRatesInput!
    description: String
  }

  input UpdateSPKWorkItemInput {
    boqVolume: WorkItemVolumeInput
    rates: WorkItemRatesInput
    description: String
  }

  input CreateWorkItemInput {
    name: String!
    categoryId: ID
    subCategoryId: ID
    unitId: ID
    rates: WorkItemRatesInput!
    description: String
  }

  input UpdateWorkItemInput {
    name: String
    categoryId: ID
    subCategoryId: ID
    unitId: ID
    rates: WorkItemRatesInput
    description: String
  }

  type Rate {
    rate: Float!
    description: String
  }

  type WorkItemRates {
    nr: Rate!
    r: Rate!
  }

  input RateInput {
    rate: Float!
    description: String
  }

  input WorkItemRatesInput {
    nr: RateInput!
    r: RateInput!
  }

  type PasswordChangeResponse {
    success: Boolean!
    message: String!
  }

  type SPKProgressResponse {
    physicalProgress: Float!
    financialProgress: Float!
    costs: Costs!
    workItemsProgress: [WorkItemProgress!]!
    dailyActivities: [DailyActivity!]!
  }

  type DailyProgressResponse {
    date: String!
    progress: Progress!
    costs: Costs!
  }

  type WeeklyProgressResponse {
    week: Int!
    year: Int!
    progress: Progress!
    costs: Costs!
  }

  type MonthlyProgressResponse {
    month: Int!
    year: Int!
    progress: Progress!
    costs: Costs!
  }

  type Progress {
    physical: Float!
    financial: Float!
  }

  type Costs {
    equipment: Float!
    manpower: Float!
    material: Float!
    other: Float!
    total: Float!
  }

  type WorkItemProgress {
    workItemId: WorkItem!
    plannedQuantity: WorkItemVolume!
    actualQuantity: WorkItemVolume!
    progressPercentage: Float!
  }

  input SubmitDailyReportInput {
    spkId: ID!
    date: String!
    location: String
    weather: String
    workStartTime: String
    workEndTime: String
    closingRemarks: String
    activityDetails: [ActivityDetailInput!]!
    equipmentLogs: [EquipmentLogInput!]!
    manpowerLogs: [ManpowerLogInput!]!
    materialUsageLogs: [MaterialUsageLogInput!]!
    otherCosts: [OtherCostInput!]
  }

  input ActivityDetailInput {
    workItemId: ID!
    actualQuantity: WorkItemVolumeInput!
    status: String!
    remarks: String
  }

  input EquipmentLogInput {
    equipmentId: ID!
    fuelIn: Float
    fuelRemaining: Float
    workingHour: Float
    isBrokenReported: Boolean
    brokenDescription: String
    remarks: String
  }

  input ManpowerLogInput {
    role: ID!
    personCount: Int!
    normalHoursPerPerson: Float
    normalHourlyRate: Float!
    overtimeHourlyRate: Float!
  }

  input MaterialUsageLogInput {
    materialId: ID!
    quantity: Float
    unitRate: Float
    remarks: String
  }

  input OtherCostInput {
    costType: String!
    amount: Float!
    description: String
    receiptNumber: String
    remarks: String
  }

  type DailyReportResponse {
    id: ID!
    date: String!
    status: String!
    progress: Progress!
    costs: Costs!
    progressPercentage: Float!
    activityDetails: [ActivityDetail!]!
    equipmentLogs: [EquipmentLog!]!
    manpowerLogs: [ManpowerLog!]!
    materialUsageLogs: [MaterialUsageLog!]!
    otherCosts: [OtherCost!]!
  }

  type SPKWithProgress {
    id: ID!
    spkNo: String!
    wapNo: String!
    title: String!
    projectName: String!
    date: String!
    contractor: String!
    workDescription: String!
    location: Area
    startDate: String
    endDate: String
    budget: Float!
    workItems: [SPKWorkItemWithProgress!]
    overallProgress: Float!
    financialProgress: Float!
    costs: Costs!
    dailyActivities: [DailyActivityWithDetails!]
    createdAt: String!
    updatedAt: String!
  }

  type DailyActivityWithDetails {
    id: ID!
    date: String!
    location: String
    weather: String
    status: String!
    workStartTime: String
    workEndTime: String
    closingRemarks: String
    progressPercentage: Float!
    activityDetails: [ActivityDetail!]!
    equipmentLogs: [EquipmentLog!]!
    manpowerLogs: [ManpowerLog!]!
    materialUsageLogs: [MaterialUsageLog!]!
    otherCosts: [OtherCost!]!
    createdAt: String!
    updatedAt: String!
  }

  type SPKWorkItemWithProgress {
    workItemId: ID!
    workItem: WorkItem
    boqVolume: WorkItemVolume!
    actualVolume: WorkItemVolume!
    progressPercentage: Float!
    amount: Float!
    rates: WorkItemRates!
    description: String
  }

  # OtherCost
  type OtherCost {
    id: ID!
    dailyActivityId: ID!
    costType: String!
    amount: Float!
    description: String
    receiptNumber: String
    remarks: String
    dailyActivity: DailyActivity
    createdAt: String!
    updatedAt: String!
  }
`;

module.exports = typeDefs; 