const { gql } = require('graphql-tag');

const typeDefs = gql`
  scalar Date

  # User
  type User {
    id: ID!
    username: String!
    fullName: String!
    role: PersonnelRole!
    area: Area
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
    totalBudget: Float
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
    rentalRatePerDay: Float!
    contract: Contract
  }

  # PersonnelRole
  type PersonnelRole {
    id: ID!
    roleCode: String!
    roleName: String!
    description: String
    isPersonel: Boolean!
    salaryComponent: SalaryComponent
    createdAt: String
    updatedAt: String
  }

  # PersonnelRole when accessed through SalaryComponent
  type SalaryComponentPersonnelRole {
    id: ID
    roleCode: String
    roleName: String
    description: String
    isPersonel: Boolean
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
    createdAt: String!
    updatedAt: String!
  }

  input FuelPriceInput {
    fuelType: String!
    pricePerLiter: Float!
    effectiveDate: String!
    description: String
  }

  # Area
  type Area {
    id: ID!
    name: String
    location: Location
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
    contractNo: String
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
    status: String!
    workItems: [SPKWorkItem!]
    totalWorkItems: Int!
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

  # Simple Daily Activity for fast loading (without heavy details)
  type MyDailyActivityItem {
    id: ID!
    date: String!
    location: String
    weather: String
    status: String!
    workStartTime: String
    workEndTime: String
    closingRemarks: String
    isApproved: Boolean
    area: Area
    spk: SPK
    user: User
    createdAt: String!
    updatedAt: String!
  }

  # Paginated response for MyDailyActivity query
  type MyDailyActivityResponse {
    activities: [MyDailyActivityItem!]!
    totalCount: Int!
    hasMore: Boolean!
    currentPage: Int!
    totalPages: Int!
  }

  # Debug response type
  type DebugResponse {
    success: Boolean!
    message: String!
    userIdUsed: String
    userIdType: String
    userIdFormats: [String]
    sampleActivity: DebugActivity
    error: String
  }

  type DebugActivity {
    id: ID!
    date: String
    createdBy: String
  }

  # ActivityDetail
  type ActivityDetail {
    id: ID!
    dailyActivityId: ID!
    workItemId: ID!
    # Data historis dari SPK saat pembuatan
    boqVolume: WorkItemVolume
    rates: WorkItemRates
    # Data eksekusi
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
    rentalRatePerDay: Float
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

  # BorrowPit
  type BorrowPit {
    id: ID!
    name: String!
    locationName: String
    coordinates: [Float!]!
    createdAt: String!
    updatedAt: String!
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
    equipments(status: EquipmentServiceStatus): [Equipment!]!
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
    fuelPriceByDate(fuelType: String!, date: String!): FuelPrice

    # Area
    areas: [Area!]!
    area(id: ID!): Area
    areasNearby(latitude: Float!, longitude: Float!, maxDistance: Float!): [Area!]!

    # SPK
    spks(startDate: String, endDate: String, locationId: ID, keyword: String, status: String): [SPK!]!
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
    
    # Fast query for user's own daily activities with pagination
    getMyDailyActivity(
      limit: Int = 10
      skip: Int = 0
      startDate: String
      endDate: String
    ): MyDailyActivityResponse!

    # Get activities by area with pagination
    getActivityByArea(
      areaId: ID!
      limit: Int = 10
      skip: Int = 0
      startDate: String
      endDate: String
    ): MyDailyActivityResponse!

    # Debug query to test user filtering
    getMyDailyActivityDebug: DebugResponse!
    
    # Consolidated query to get daily activities with details (replaces multiple old queries)
    getDailyActivityWithDetails(
      areaId: ID
      userId: ID
      activityId: ID
      spkId: ID
      startDate: String
      endDate: String
    ): [LaporanByAreaDetails!]!
    
    # Get single daily activity with details by activity ID
    getDailyActivityWithDetailsByActivityId(activityId: ID!): LaporanByAreaDetails
    
    # DEPRECATED - Use getDailyActivityWithDetails instead
    dailyActivitiesWithDetailsByUser(userId: ID!): [DailyActivityWithDetails!]! @deprecated(reason: "Use getDailyActivityWithDetails with userId parameter")
    dailyActivitiesWithDetailsByUserAndApprover(userId: ID!, approverId: ID!): [DailyActivityWithDetails!]! @deprecated(reason: "Approver system changed to area-based. Use getDailyActivityWithDetails instead")
    dailyActivitiesWithDetailsByApprover(approverId: ID!): [DailyActivityWithDetails!]! @deprecated(reason: "Approver system changed to area-based. Use getDailyActivityWithDetails instead")
    getLaporanByArea(areaId: ID, startDate: String, endDate: String, status: String): [LaporanByAreaDetails!]! @deprecated(reason: "Use getDailyActivityWithDetails with areaId parameter")

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

    spkDetailsWithProgress(spkId: ID!, startDate: String, endDate: String): SPKDetailsWithProgress!
    spkWithProgressBySpkId(spkId: ID!): SPKWithProgressSummary!

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

    # Equipment Repair Report Queries
    equipmentRepairReports(status: RepairReportStatus, equipmentId: ID, reportedBy: ID): [EquipmentRepairReport!]!
    equipmentRepairReport(id: ID!): EquipmentRepairReport
    equipmentRepairReportsByEquipment(equipmentId: ID!): [EquipmentRepairReport!]!
    equipmentRepairReportsByReporter(reportedBy: ID!): [EquipmentRepairReport!]!
    equipmentRepairReportsByCreator(createdBy: ID): [EquipmentRepairReport!]!
    myEquipmentRepairReports: [EquipmentRepairReport!]!
    pendingRepairReports: [EquipmentRepairReport!]!

    # BorrowPit
    borrowPits: [BorrowPit!]!
    borrowPit(id: ID!): BorrowPit
    searchBorrowPits(name: String!): [BorrowPit!]!
    borrowPitsNearPoint(longitude: Float!, latitude: Float!, maxDistance: Float): [BorrowPit!]!

    dashboardSummary(timeRange: String, projectId: ID): DashboardSummary!
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
      area: ID
    ): AuthPayload!
    
    login(
      username: String!
      password: String!
    ): AuthPayload!
    
    # Update DailyActivity after submit/approve
    updateDailyActivityAfterSubmit(
      id: ID!
      input: UpdateDailyActivityInput!
    ): DailyActivity!

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
      totalBudget: Float
    ): Contract!

    updateContract(
      id: ID!
      contractNo: String
      description: String
      startDate: String
      endDate: String
      vendorName: String
      totalBudget: Float
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
      isPersonel: Boolean = true
    ): PersonnelRole!

    updatePersonnelRole(
      id: ID!
      roleCode: String
      roleName: String
      description: String
      isPersonel: Boolean
    ): PersonnelRole!

    deletePersonnelRole(id: ID!): Boolean!

    # FuelPrice
    createFuelPrice(input: FuelPriceInput!): FuelPrice!
    updateFuelPrice(id: ID!, fuelType: String, pricePerLiter: Float, effectiveDate: String, description: String): FuelPrice!
    deleteFuelPrice(id: ID!): Boolean!

    # SPK
    createSPK(input: CreateSPKInput!): SPK!
    updateSPK(id: ID!, input: UpdateSPKInput!): SPK!
    deleteSPK(id: ID!): Boolean!
    addWorkItemToSPK(spkId: ID!, input: AddWorkItemInput!): SPK!
    removeWorkItemFromSPK(spkId: ID!, workItemId: ID!): SPK!
    updateSPKWorkItem(spkId: ID!, workItemId: ID!, input: UpdateSPKWorkItemInput!): SPK!
    updateSpkStatus(id: ID!, status: String!): SPK!

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

    # DEPRECATED - Use approveDailyReport instead (approval is now area-based)
    updateApproval(
      id: ID!
      status: String!
      remarks: String
    ): DailyActivity! @deprecated(reason: "Use approveDailyReport instead. Approval system changed to area-based.")

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

    # User Area Management
    updateUserArea(
      userId: ID!
      areaId: ID!
    ): User!

    removeUserArea(
      userId: ID!
    ): User!

    # Bulk Area Assignment
    assignUsersToArea(
      userIds: [ID!]!
      areaId: ID!
    ): [User!]!

    # Equipment Repair Report Mutations
    createEquipmentRepairReport(input: CreateEquipmentRepairReportInput!): EquipmentRepairReport!
    updateEquipmentRepairReport(id: ID!, input: UpdateEquipmentRepairReportInput!): EquipmentRepairReport!
    reviewEquipmentRepairReport(id: ID!, input: ReviewEquipmentRepairReportInput!): EquipmentRepairReport!
    updateRepairProgress(id: ID!, input: UpdateRepairProgressInput!): EquipmentRepairReport!
    deleteEquipmentRepairReport(id: ID!): Boolean!

    # BorrowPit
    createBorrowPit(input: BorrowPitInput!): BorrowPit!
    updateBorrowPit(id: ID!, input: BorrowPitUpdateInput!): BorrowPit!
    deleteBorrowPit(id: ID!): DeleteResponse!
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
    contractNo: String
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
    total: Float
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
    rentalRatePerDay: Float
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
    dailyActivities: [DailyActivityWithDetails!]!
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
    totalWorkItems: Int!
    createdAt: String!
    updatedAt: String!
  }

  # Laporan by Area Details type
  type LaporanByAreaDetails {
    id: ID!
    date: String!
    area: Area
    weather: String
    status: String!
    workStartTime: String
    workEndTime: String
    startImages: [String!]
    finishImages: [String!]
    closingRemarks: String
    isApproved: Boolean
    approvedBy: User
    approvedAt: String
    rejectionReason: String
    progressPercentage: Float!
    budgetUsage: Float!
    dailyProgress: DailyProgress
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

  # Daily Progress type
  type DailyProgress {
    totalDailyTargetBOQ: DailyTargetBOQ!
    totalActualBOQ: DailyTargetBOQ!
    dailyProgressPercentage: Float!
    workItemProgress: [WorkItemDailyProgress!]!
  }

  type DailyTargetBOQ {
    nr: Float!
    r: Float!
    total: Float!
  }

  type WorkItemDailyProgress {
    workItemId: ID!
    workItemName: String!
    targetBOQ: DailyTargetBOQ!
    actualBOQ: DailyTargetBOQ!
    progressPercentage: Float!
    unit: Unit
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
    personnelRole: SalaryComponentPersonnelRole
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
    totalTargetBOQ: Float!
    totalCompletedBOQ: Float!
    remainingBOQ: Float!
    # Financial data kept for reference
    totalBudget: Float!
    totalSpent: Float!
    remainingBudget: Float!
    totalSales: Float!
    # Detailed daily sales breakdown
    totalSalesDetails: [TotalSalesDetail!]!
    # Enhanced progress details
    workItemCompletionPercentage: Float!
    completedWorkItems: Int!
    totalWorkItems: Int!
    budgetUtilizationPercentage: Float!
    plannedVsActualCostRatio: Float!
    totalPlannedCost: Float!
    isOverBudget: Boolean!
    costBreakdown: CostBreakdownSummary!
    # Additional metrics
    averageItemProgress: Float!
    onTrackItems: Int!
    projectDuration: Int!
    remainingDays: Int!
  }

  type CostBreakdownSummary {
    materials: CostCategorySummary!
    manpower: CostCategorySummary!
    equipment: CostCategorySummary!
    others: CostCategorySummary!
  }

  type CostCategorySummary {
    amount: Float!
    percentage: Float!
    count: Int!
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

  # Sales detail per daily activity for financial auditing
  type TotalSalesDetail {
    dailyActivityId: ID!
    date: String!
    totalSales: Float!
  }

  type CostCategory {
    totalCost: Float!
    items: [CostItem!]!
  }

  type CostBreakdown {
    materials: MaterialCost!
    material: Float!
    manpower: ManpowerCost!
    equipment: EquipmentCost!
    other: Float!
    total: Float
  }
  
  type MaterialCost {
    total: Float!
    items: [CostItem]
    percentage: Float
    amount: Float
    count: Int
  }
  
  type ManpowerCost {
    total: Float!
    items: [CostItem]
    percentage: Float
    amount: Float
    count: Int
  }
  
  type EquipmentCost {
    total: Float!
    items: [CostItem]
    percentage: Float
    amount: Float
    count: Int
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
    rentalRatePerDay: Float!
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

  type SPKWithProgressSummary {
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
    workItems: [WorkItemProgressSummary!]!
    totalProgress: TotalProgress!
    createdAt: String!
    updatedAt: String!
  }

  type WorkItemProgressSummary {
    id: ID!
    name: String!
    description: String
    category: Category
    subCategory: SubCategory
    unit: Unit
    rates: WorkItemRates!
    boqVolume: BOQVolume!
    completedVolume: BOQVolume!
    remainingVolume: BOQVolume!
    dailyTarget: BOQVolume!
    progressPercentage: Float!
    amount: Float!
    spentAmount: Float!
    remainingAmount: Float!
    # Enhanced progress details
    isCompleted: Boolean!
    isOnTrack: Boolean!
    efficiencyRatio: Float!
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
    totalWorkItems: Int!
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
    description: String
  }

  type WorkItemRates {
    nr: Rate!
    r: Rate!
  }

  # BorrowPit
  type BorrowPit {
    id: ID!
    name: String!
    locationName: String
    coordinates: [Float!]!
    createdAt: String!
    updatedAt: String!
  }

  input BorrowPitInput {
    name: String!
    locationName: String
    longitude: Float!
    latitude: Float!
  }

  input BorrowPitUpdateInput {
    name: String
    locationName: String
    longitude: Float
    latitude: Float
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

  # Equipment Repair Report
  type EquipmentRepairReport {
    id: ID!
    reportNumber: String!
    equipment: Equipment!
    reportedBy: User!
    reportDate: String!
    problemDescription: String!
    damageLevel: DamageLevel!
    reportImages: [String!]
    location: Area
    immediateAction: String
    status: RepairReportStatus!
    priority: RepairPriority!
    reviewedBy: User
    reviewDate: String
    reviewNotes: String
    rejectionReason: String
    assignedTechnician: String
    estimatedCost: Float
    actualCost: Float
    repairStartDate: String
    repairCompletionDate: String
    repairNotes: String
    repairImages: [String!]
    statusHistory: [RepairStatusHistory!]!
    isActive: Boolean
    createdAt: String!
    updatedAt: String!
  }

  type RepairStatusHistory {
    status: RepairReportStatus!
    changedBy: User!
    changedAt: String!
    notes: String
  }

  enum DamageLevel {
    RINGAN
    SEDANG
    BERAT
    TOTAL
  }

  enum RepairReportStatus {
    PENDING
    APPROVED
    REJECTED
    IN_REPAIR
    COMPLETED
  }

  enum RepairPriority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  # Input Types for Equipment Repair Report
  input CreateEquipmentRepairReportInput {
    equipmentId: ID!
    problemDescription: String!
    damageLevel: DamageLevel!
    reportImages: [String!]
    location: ID!
    immediateAction: String
    priority: RepairPriority
  }

  input UpdateEquipmentRepairReportInput {
    problemDescription: String
    damageLevel: DamageLevel
    reportImages: [String!]
    location: ID
    immediateAction: String
    priority: RepairPriority
    assignedTechnician: String
    estimatedCost: Float
    repairStartDate: String
    repairNotes: String
  }

  input ReviewEquipmentRepairReportInput {
    status: RepairReportStatus!
    reviewNotes: String
    rejectionReason: String
    assignedTechnician: String
    estimatedCost: Float
    priority: RepairPriority
  }

  input UpdateRepairProgressInput {
    status: RepairReportStatus
    actualCost: Float
    repairCompletionDate: String
    repairNotes: String
    repairImages: [String!]
  }

  # Input type untuk update DailyActivity setelah disubmit/diapprove
  input UpdateDailyActivityInput {
    date: String
    location: String
    weather: String
    workStartTime: String
    workEndTime: String
    startImages: [String!]
    finishImages: [String!]
    closingRemarks: String
  }

  type MonthlySales {
    year: Int!
    month: Int!
    monthName: String!
    sales: Float!
    cost: Float!
    costBreakdown: CostBreakdown!
    profit: Float!
    profitMargin: Float!
    spkCount: Int!
  }

  type SPKProgress {
    spkId: ID!
    spkTitle: String!
    spkBudget: Float!
    activityCount: Int!
  }

  type MonthlyCapaian {
    year: Int!
    month: Int!
    monthName: String!
    spkProgress: [SPKProgress!]!
    totalSPKActive: Int!
    totalBudget: Float!
  }

  type DashboardSummary {
    totalSPK: Int!
    totalWorkItems: Int!
    totalReports: Int!
    totalDailyActivities: Int!
    totalRepairReports: Int!
    totalSales: Float
    totalCosts: Float
    totalspkclose: TotalSpkClose!
    monthlySales: [MonthlySalesDetail!]!
    monthlyCosts: [MonthlyCostDetail!]!
    borrowPitLocations: [BorrowPitLocation!]!
    contractProgressPercent: Float!
    totalSpkContract: TotalSpkContract!
    spkPerformance: [SPKPerformance!]!
    progressByMonth: [MonthlyProgressDetail!]!
    costBreakdown: CostBreakdownTotal!
    monthlyTrend: [MonthlyTrend!]!
    workItemsDistribution: [WorkItemDistribution!]!
    activityStatusDistribution: [ActivityStatusDistribution!]!
    equipmentPerformance: [EquipmentPerformance!]!
  }

  # GeoJSON Types
  type Point {
    type: String!
    coordinates: [Float!]!
  }

  # Dashboard Types
  type MonthlySalesPerSPK {
    spkId: ID!
    spkNo: String
    title: String
    amount: Float!
  }

  type MonthlySalesActivityDetail {
    dailyActivityId: ID!
    date: String
    spkId: ID!
    spkNo: String
    title: String
    workItemId: ID!
    workItemName: String
    nrQty: Float
    rQty: Float
    nrRate: Float
    rRate: Float
    amount: Float!
  }

  type MonthlySalesDetail {
    year: Int!
    month: Int!
    monthName: String!
    totalSales: Float!
    spkCount: Int!
    amount: Float
    perSpk: [MonthlySalesPerSPK!]!
    activityDetails: [MonthlySalesActivityDetail!]!
  }

  type MonthlyCostDetail {
    year: Int!
    month: Int!
    monthName: String!
    totalCosts: Float!
    count: Int!
    amount: Float
  }
  
  type MonthlyProgressDetail {
    year: Int!
    month: Int!
    monthName: String!
    progressPercentage: Float!
    percentage: Float
  }
  
  type EquipmentPerformance {
    id: ID!
    equipmentId: String
    name: String!
    utilizationRate: Float!
    operationalHours: Float!
    totalWorkingHours: Float
    maintenanceCost: Float!
    totalMaintenanceHours: Float
    status: String!
  }

  type BorrowPitLocation {
    id: ID!
    name: String!
    location: Point!
  }

  type MonthlyTrend {
    year: Int!
    month: Int!
    monthName: String!
    value: Float!
    category: String!
  }

  type WorkItemDistribution {
    name: String!
    value: Float!
  }

  type ActivityStatusDistribution {
    status: String!
    count: Int!
  }

  type CostBreakdownTotal {
    itemCost: Float!
    workCost: Float!
    equipmentCost: Float!
    laborCost: Float!
    mobilizationCost: Float!
    demobilizationCost: Float!
    totalCost: Float!
    totalMaterialCost: Float!
    totalManpowerCost: Float!
    totalEquipmentCost: Float!
    # Added detailed equipment and other costs for dashboard
    equipmentFuelCost: Float!
    equipmentRentalCost: Float!
    otherBreakdown: [OtherCostGroup!]!
  }

  type OtherCostGroup {
    costType: String!
    total: Float!
    count: Int!
  }

  # Chart Types

  type SPKTotalProgress {
    percentage: Float!
    totalCost: Float!
    totalBudget: Float!
    totalSpent: Float!
    remainingBudget: Float!
    budgetUtilizationPercentage: Float!
    plannedVsActualCostRatio: Float!
    totalPlannedCost: Float!
    isOverBudget: Boolean!
    costBreakdown: CostBreakdown!
    costBreakdownTotal: CostBreakdownTotal!
  }
  
  type SPKPerformance {
    spkId: ID!
    spkNo: String!
    title: String!
    projectName: String
    budget: Float
    workItemsAmount: Float!
    workItemsCount: Int!
    date: String!
    location: SPKLocation
    workItems: [SPKWorkItemDetail!]!
    completedAmount: Float!
    progressPercentage: Float!
    activityCount: Int!
    totalProgress: SPKTotalProgress
  }

  type TotalSpkContract {
    percentage: Float!
    totalBudgetSpk: Float!
    totalBudgetContract: Float!
  }
  
  type TotalSpkClose {
    totalSpk: Int!
    totalBudgetSpk: Float!
  }

  type MonthlyTrend {
    year: Int!
    month: Int!
    monthName: String!
    totalSales: Float!
    spkCount: Int!
  }

  type WorkItemDistribution {
    categoryName: String!
    count: Int!
  }

  type ActivityStatusDistribution {
    status: String!
    count: Int!
  }

  # Supporting types for new dashboard fields
  type PlanVsActual {
    plan: Float!
    actual: Float!
  }

  type SPKLocation {
    locationId: ID!
    name: String!
    latitude: Float
    longitude: Float
  }

  type BorrowPitLocation {
    borrowPitId: ID!
    name: String!
    locationName: String
    latitude: Float
    longitude: Float
  }

  type SPKWorkItemDetail {
    workItemId: ID!
    name: String!
    description: String
    quantity: Float
    unit: String
    unitPrice: Float
    amount: Float
    category: String
    subCategory: String
  }
`;

module.exports = typeDefs;