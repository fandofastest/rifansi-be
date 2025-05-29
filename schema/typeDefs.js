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
    area: Area
    year: Int
    serviceStatus: EquipmentServiceStatus!
    contracts: [EquipmentContract]
    description: String
    areaHistory: [EquipmentAreaHistory!]!
    serviceHistory: [EquipmentServiceHistory!]!
    lastUpdatedBy: User
    lastUpdatedAt: String
    createdAt: String!
    updatedAt: String!
    currentFuelPrice: FuelPrice
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
    description: String
    salaryComponent: SalaryComponent
    createdAt: String
    updatedAt: String
  }

  # FuelPrice
  type FuelPrice {
    id: ID!
    fuelType: String!
    pricePerLiter: Float!
    effectiveDate: Date!
    description: String
    createdAt: Date
    updatedAt: Date
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
    startImages: [String!]
    finishImages: [String!]
    createdBy: ID!
    closingRemarks: String
    isActive: Boolean
    isApproved: Boolean
    approvedBy: User
    approvedAt: String
    rejectionReason: String
    approvalHistory: [ApprovalHistory!]
    lastUpdatedBy: User
    lastUpdatedAt: String
    createdAt: String!
    updatedAt: String!
    spk: SPK
    user: User
  }

  type ApprovalHistory {
    status: String!
    remarks: String
    updatedBy: User!
    updatedAt: String!
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
    hourlyRate: Float
    fuelPrice: Float
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
    hourlyRate: Float!
    workingHours: Float!
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

  # Holiday
  type Holiday {
    id: ID!
    date: String!
    name: String!
    description: String
    isNational: Boolean!
    createdBy: User
    createdAt: String!
    updatedAt: String!
  }

  # ApproverSetting
  type ApproverSetting {
    id: ID!
    userId: User!
    approverId: User!
    isActive: Boolean!
    createdBy: User!
    lastUpdatedBy: User
    createdAt: String!
    updatedAt: String!
  }

  # Report
  type Report {
    id: ID!
    title: String!
    content: String!
    status: ReportStatus!
    createdBy: User!
    createdAt: String!
    updatedAt: String!
    approvedBy: User
    approvedAt: String
    rejectedBy: User
    rejectedAt: String
    rejectionReason: String
  }

  enum ReportStatus {
    PENDING
    APPROVED
    REJECTED
  }

  # Equipment History Types
  type EquipmentAreaHistory {
    areaId: ID!
    area: Area
    remarks: String
    updatedBy: User!
    updatedAt: String!
  }

  type EquipmentServiceHistory {
    status: EquipmentServiceStatus!
    remarks: String
    updatedBy: User!
    updatedAt: String!
  }

  # Backup and Restore Types
  type BackupResponse {
    success: Boolean!
    message: String!
    backupPath: String
    timestamp: String
    collections: [String!]
    downloadUrl: String
  }

  type RestoreResponse {
    success: Boolean!
    message: String!
    restoredCollections: [String!]
    timestamp: String
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
    equipmentsByArea(areaId: ID!): [Equipment!]!

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
    dailyActivitiesByUser(userId: ID!): [DailyActivity!]!
    dailyActivitiesWithDetailsByUser(userId: ID!): [DailyActivityWithDetails!]!
    dailyActivitiesWithDetailsByUserAndApprover(userId: ID!, approverId: ID!): [DailyActivityWithDetails!]!
    dailyActivitiesWithDetailsByApprover(approverId: ID!): [DailyActivityWithDetails!]!

    # ActivityDetail
    activityDetails: [ActivityDetail!]!
    activityDetail(id: ID!): ActivityDetail
    activityDetailsByDailyActivity(dailyActivityId: ID!): [ActivityDetail!]!
    activityDetailsByUser(userId: ID!): [ActivityDetail!]!

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

    # SalaryComponent Queries
    salaryComponents: [SalaryComponent!]!
    salaryComponent(id: ID!): SalaryComponent
    salaryComponentByPersonnelRole(personnelRoleId: ID!): SalaryComponent
    getSalaryComponentDetails(personnelRoleId: ID!, date: String): SalaryComponentDetails
    getSalaryComponentDetailWithDate(personnelRoleId: ID!, date: String!, workHours: Int!): SalaryComponentDetailWithDate
    
    # OvertimeRate Queries
    overtimeRates: [OvertimeRate!]!
    overtimeRate(id: ID!): OvertimeRate
    overtimeRateByWorkHour(waktuKerja: Int!): OvertimeRate

    # Holiday Queries
    holidays(startDate: String, endDate: String): [Holiday!]!
    holiday(id: ID!): Holiday
    holidayByDate(date: String!): Holiday
    isHoliday(date: String!): Boolean!

    spkDetailsWithProgress(spkId: ID!): SPKDetailsWithProgress!

    # ApproverSetting Queries
    approverSettings: [ApproverSetting!]!
    approverSetting(id: ID!): ApproverSetting
    getUserApprover(userId: ID!): ApproverSetting
    getApproverUsers(approverId: ID!): [ApproverSetting!]!

    # Equipment History Queries
    getEquipmentAreaHistory(equipmentId: ID!): [EquipmentAreaHistory!]!
    getEquipmentServiceHistory(equipmentId: ID!): [EquipmentServiceHistory!]!

    # Backup and Restore Queries
    getBackupHistory: [BackupResponse!]!
    getLatestBackup: BackupResponse
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
      area: ID!
      year: Int
      serviceStatus: String
      description: String
    ): Equipment!

    updateEquipment(
      id: ID!
      equipmentCode: String
      plateOrSerialNo: String
      equipmentType: String
      defaultOperator: String
      area: ID
      year: Int
      serviceStatus: String
      description: String
    ): Equipment!

    deleteEquipment(id: ID!): Boolean!

    # PersonnelRole
    createPersonnelRole(
      roleCode: String!
      roleName: String!
      description: String
    ): PersonnelRole!

    updatePersonnelRole(
      id: ID!
      roleCode: String
      roleName: String
      description: String
    ): PersonnelRole!

    deletePersonnelRole(id: ID!): Boolean!

    # FuelPrice
    createFuelPrice(
      fuelType: String!
      pricePerLiter: Float!
      effectiveDate: Date!
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

    # Approval Mutation
    updateApproval(
      id: ID!
      status: String!
      remarks: String
    ): DailyActivity!

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
      hourlyRate: Float
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
      hourlyRate: Float
      isBrokenReported: Boolean
      remarks: String
    ): EquipmentLog!

    deleteEquipmentLog(id: ID!): Boolean!

    # ManpowerLog
    createManpowerLog(
      dailyActivityId: ID!
      role: ID!
      personCount: Int!
      hourlyRate: Float!
      workingHours: Float!
    ): ManpowerLog!

    updateManpowerLog(
      id: ID!
      dailyActivityId: ID
      role: ID
      personCount: Int
      hourlyRate: Float
      workingHours: Float
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
    updateMyProfile(
      fullName: String
      email: String
      phone: String
    ): ProfileUpdateResponse!
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

    # SalaryComponent Mutations
    createSalaryComponent(
      personnelRoleId: ID!
      gajiPokok: Float
      tunjanganTetap: Float
      tunjanganTidakTetap: Float
      transport: Float
      pulsa: Float
      bpjsKT: Float
      bpjsJP: Float
      bpjsKES: Float
      uangCuti: Float
      thr: Float
      santunan: Float
      hariPerBulan: Int
      upahLemburHarian: Float
    ): SalaryComponent!
    
    updateSalaryComponent(
      id: ID!
      gajiPokok: Float
      tunjanganTetap: Float
      tunjanganTidakTetap: Float
      transport: Float
      pulsa: Float
      bpjsKT: Float
      bpjsJP: Float
      bpjsKES: Float
      uangCuti: Float
      thr: Float
      santunan: Float
      hariPerBulan: Int
      upahLemburHarian: Float
    ): SalaryComponent!
    
    deleteSalaryComponent(id: ID!): Boolean!
    
    # OvertimeRate Mutations
    createOvertimeRate(
      waktuKerja: Int!
      normal: Float!
      weekend: Float!
      libur: Float!
    ): OvertimeRate!
    
    updateOvertimeRate(
      id: ID!
      waktuKerja: Int
      normal: Float
      weekend: Float
      libur: Float
    ): OvertimeRate!
    
    deleteOvertimeRate(id: ID!): Boolean!

    # Holiday Mutations
    createHoliday(
      date: String!
      name: String!
      description: String
      isNational: Boolean
    ): Holiday!
    
    updateHoliday(
      id: ID!
      date: String
      name: String
      description: String
      isNational: Boolean
    ): Holiday!
    
    deleteHoliday(id: ID!): Boolean!

    # Import Holidays
    importHolidays(year: Int): ImportHolidaysResponse!
    importHolidaysFromData(holidays: [HolidayInput!]!): ImportHolidaysResponse!

    # ApproverSetting Mutations
    createApproverSetting(input: ApproverSettingInput!): ApproverSetting!
    updateApproverSetting(id: ID!, isActive: Boolean!): ApproverSetting!
    deleteApproverSetting(id: ID!): Boolean!
    getApproverByUser(userId: ID!): User

    approveDailyReport(
      id: ID!
      status: String!
      remarks: String
    ): DailyActivity!

    deleteDailyActivityById(id: ID!): DeleteResponse!

    # Report mutations
    approveReport(reportId: ID!): Report!
    rejectReport(reportId: ID!, reason: String!): Report!
    deleteReport(reportId: ID!): Boolean!

    # Equipment Service Mutations
    updateEquipmentServiceStatus(
      equipmentId: ID!
      serviceStatus: EquipmentServiceStatus!
      remarks: String
    ): Equipment!

    updateEquipmentArea(
      equipmentId: ID!
      areaId: ID!
      remarks: String
    ): Equipment!

    # Password Management
    updatePassword(
      currentPassword: String!
      newPassword: String!
    ): PasswordUpdateResponse!

    # Backup and Restore Mutations
    createBackup(description: String): BackupResponse!
    restoreFromBackup(backupPath: String!): RestoreResponse!
    deleteBackup(backupPath: String!): Boolean!
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
    completedVolume: BOQVolume!
    remainingVolume: BOQVolume!
    percentageComplete: Float!
    spentAmount: Float!
    remainingAmount: Float!
  }

  input SubmitDailyReportInput {
    spkId: ID!
    date: String!
    areaId: ID!
    weather: String
    workStartTime: String
    workEndTime: String
    startImages: [String!]
    finishImages: [String!]
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
    hourlyRate: Float
    isBrokenReported: Boolean
    brokenDescription: String
    remarks: String
  }

  input ManpowerLogInput {
    role: ID!
    personCount: Int!
    hourlyRate: Float!
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
    area: Area
    weather: String
    status: String!
    workStartTime: String
    workEndTime: String
    startImages: [String!]
    finishImages: [String!]
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
    startImages: [String!]
    finishImages: [String!]
    closingRemarks: String
    progressPercentage: Float!
    activityDetails: [ActivityDetail!]!
    equipmentLogs: [EquipmentLog!]!
    manpowerLogs: [ManpowerLog!]!
    materialUsageLogs: [MaterialUsageLog!]!
    otherCosts: [OtherCost!]!
    spkDetail: SPK
    userDetail: User
    createdAt: String!
    updatedAt: String!
  }

  type SPKWorkItemWithProgress {
    workItemId: ID!
    description: String
    boqVolume: BOQVolume!
    amount: Float!
    rates: WorkItemRates!
    progress: WorkItemProgress!
    workItem: WorkItem
    dailyActivityId: ID!
    lastUpdatedAt: String
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

  # SalaryComponent
  type SalaryComponent {
    id: ID!
    personnelRole: PersonnelRole!
    gajiPokok: Float
    tunjanganTetap: Float
    tunjanganTidakTetap: Float
    transport: Float
    pulsa: Float
    bpjsKT: Float
    bpjsJP: Float
    bpjsKES: Float
    uangCuti: Float
    thr: Float
    santunan: Float
    hariPerBulan: Int
    totalGajiBulanan: Float
    biayaTetapHarian: Float
    upahLemburHarian: Float
    createdAt: String!
    updatedAt: String!
  }

  # OvertimeRate
  type OvertimeRate {
    id: ID!
    waktuKerja: Int!
    normal: Float!
    weekend: Float!
    libur: Float!
    createdAt: String!
    updatedAt: String!
  }

  # Input Types
  input HolidayInput {
    holiday_date: String!
    holiday_name: String!
    is_national_holiday: Boolean!
  }

  type ImportHolidaysResponse {
    success: Boolean!
    message: String!
    importedCount: Int!
    skippedCount: Int!
  }

  # SalaryComponentDetails
  type SalaryComponentDetails {
    gajiPokok: Float
    tunjanganTetap: Float
    tunjanganTidakTetap: Float
    transport: Float
    pulsa: Float
    bpjsKT: Float
    bpjsJP: Float
    bpjsKES: Float
    uangCuti: Float
    thr: Float
    santunan: Float
    hariPerBulan: Int
    subTotalPenghasilanTetap: Float
    biayaMPTetapHarian: Float
    upahLemburHarian: Float
    biayaManpowerHarian: Float
  }

  # SalaryComponentDetailWithDate
  type SalaryComponentDetailWithDate {
    gajiPokok: Float
    tunjanganTetap: Float
    tunjanganTidakTetap: Float
    transport: Float
    pulsa: Float
    bpjsKT: Float
    bpjsJP: Float
    bpjsKES: Float
    uangCuti: Float
    thr: Float
    santunan: Float
    hariPerBulan: Int
    subTotalPenghasilanTetap: Float
    biayaMPTetapHarian: Float
    upahLemburHarian: Float
    manpowerHarian: Float
    isHoliday: Boolean
    isWeekend: Boolean
    dayType: String
    overtimeMultiplier: Float
    workHours: Int
  }

  input FuelPriceInput {
    fuelType: String!
    pricePerLiter: Float!
    effectiveDate: Date!
    description: String
  }

  scalar Date

  # BOQ Volume Types
  type BOQVolume {
    nr: Float!
    r: Float!
  }

  input BOQVolumeInput {
    nr: Float!
    r: Float!
  }

  type TotalProgress {
    percentage: Float!
    totalBudget: Float!
    totalSpent: Float!
    remainingBudget: Float!
  }

  type CostItem {
    material: String
    quantity: Float
    unit: String
    unitRate: Float
    equipment: String
    role: String
    numberOfWorkers: Int
    workingHours: Float
    hourlyRate: Float
    fuelUsed: Float
    fuelPrice: Float
    description: String
    cost: Float!
    date: String!
  }

  type CostCategory {
    totalCost: Float!
    items: [CostItem!]!
  }

  type CostBreakdown {
    totalCost: Float!
    dailyActivities: [DailyActivityCost!]!
  }

  type DailyActivityCost {
    activityId: ID!
    date: String!
    location: String
    weather: String
    status: String!
    workStartTime: String
    workEndTime: String
    createdBy: String
    closingRemarks: String
    totalCost: Float!
    materials: MaterialCosts!
    manpower: ManpowerCosts!
    equipment: EquipmentCosts!
    otherCosts: OtherCosts!
  }

  type MaterialCosts {
    totalCost: Float!
    items: [MaterialCostItem!]!
  }

  type ManpowerCosts {
    totalCost: Float!
    items: [ManpowerCostItem!]!
  }

  type EquipmentCosts {
    totalCost: Float!
    items: [EquipmentCostItem!]!
  }

  type OtherCosts {
    totalCost: Float!
    items: [OtherCostItem!]!
  }

  type MaterialCostItem {
    material: String!
    quantity: Float!
    unit: String!
    unitRate: Float!
    cost: Float!
  }

  type ManpowerCostItem {
    role: String!
    numberOfWorkers: Int!
    workingHours: Float!
    hourlyRate: Float!
    cost: Float!
  }

  type EquipmentCostItem {
    equipment: Equipment!
    workingHours: Float!
    hourlyRate: Float!
    fuelUsed: Float!
    fuelPrice: Float!
    cost: Float!
  }

  type OtherCostItem {
    description: String!
    cost: Float!
  }

  type SPKDetailsWithProgress {
    id: ID!
    spkNo: String!
    wapNo: String!
    title: String!
    projectName: String!
    date: String!
    contractor: String!
    workDescription: String!
    location: Area!
    startDate: String
    endDate: String
    budget: Float!
    dailyActivities: [DailyActivityWithDetails!]!
    totalProgress: TotalProgress!
    createdAt: String!
    updatedAt: String!
  }

  # ApproverSetting Input
  input ApproverSettingInput {
    userId: ID!
    approverId: ID!
  }

  input ApproveDailyReportInput {
    id: ID!
    status: String!
    remarks: String
  }

  type DeleteResponse {
    success: Boolean!
    message: String!
  }

  type DailyActivityWithDetails {
    id: ID!
    date: String!
    location: String
    weather: String
    status: String
    workStartTime: String
    workEndTime: String
    createdBy: String
    closingRemarks: String
    workItems: [WorkItemWithProgress!]!
    costs: DailyActivityCosts!
  }

  type DailyActivityCosts {
    materials: MaterialCosts!
    manpower: ManpowerCosts!
    equipment: EquipmentCosts!
    otherCosts: OtherCosts!
  }

  type WorkItemWithProgress {
    id: ID!
    name: String!
    description: String
    categoryId: ID
    subCategoryId: ID
    unitId: ID
    category: Category
    subCategory: SubCategory
    unit: Unit
    rates: WorkItemRates!
    boqVolume: Quantity!
    actualQuantity: Quantity!
    lastUpdatedAt: String
    dailyProgress: Quantity!
    progressAchieved: Quantity!
    dailyCost: Quantity!
  }

  type Quantity {
    nr: Float!
    r: Float!
  }

  type Rate {
    rate: Float!
    description: String!
  }

  type WorkItemRates {
    nr: Rate!
    r: Rate!
  }

  # Equipment Service Status
  enum EquipmentServiceStatus {
    ACTIVE
    MAINTENANCE
    REPAIR
    INACTIVE
  }

  # Password Update Response
  type PasswordUpdateResponse {
    success: Boolean!
    message: String!
    user: User
  }

  # Profile Update Response
  type ProfileUpdateResponse {
    success: Boolean!
    message: String!
    user: User
  }
`;

module.exports = typeDefs; 