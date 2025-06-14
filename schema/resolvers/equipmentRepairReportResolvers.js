const { EquipmentRepairReport, Equipment, User, Area } = require('../../models');
const mongoose = require('mongoose');

const Query = {
    equipmentRepairReports: async (_, { status, equipmentId, reportedBy }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const query = { isActive: true, equipmentId: { $ne: null } };
        if (status) query.status = status;
        if (equipmentId) query.equipmentId = equipmentId;
        if (reportedBy) query.reportedBy = reportedBy;

        // PMCOW hanya bisa melihat laporan mereka sendiri
        const currentUser = await User.findById(user.userId).populate('role');
        if (currentUser.role.roleCode === 'PMCOW') {
            query.reportedBy = user.userId;
        }

        const reports = await EquipmentRepairReport.find(query)
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location')
            .populate('statusHistory.changedBy')
            .sort({ reportDate: -1 });

        // Filter out reports where equipment population failed
        return reports.filter(report => report.equipmentId != null);
    },

    equipmentRepairReport: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const report = await EquipmentRepairReport.findById(id)
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location')
            .populate('statusHistory.changedBy');

        if (!report) throw new Error('Report not found');

        // PMCOW hanya bisa melihat laporan mereka sendiri
        const currentUser = await User.findById(user.userId).populate('role');
        if (currentUser.role.roleCode === 'PMCOW' && report.reportedBy._id.toString() !== user.userId) {
            throw new Error('Unauthorized to view this report');
        }

        return report;
    },

    equipmentRepairReportsByEquipment: async (_, { equipmentId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        return EquipmentRepairReport.find({
            equipmentId,
            isActive: true
        })
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location')
            .sort({ reportDate: -1 });
    },

    equipmentRepairReportsByReporter: async (_, { reportedBy }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        // User hanya bisa melihat laporan mereka sendiri kecuali admin
        const currentUser = await User.findById(user.userId).populate('role');
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.roleCode);

        if (!isAdmin && reportedBy !== user.userId) {
            throw new Error('Unauthorized to view reports from other users');
        }

        return EquipmentRepairReport.find({
            reportedBy,
            isActive: true
        })
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location')
            .sort({ reportDate: -1 });
    },

    pendingRepairReports: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const currentUser = await User.findById(user.userId).populate(['role', 'area']);
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.roleCode);
        const isSupervisor = currentUser.role.roleCode === 'SUPERVISOR';

        if (!isAdmin && !isSupervisor) {
            throw new Error('Only admin or supervisor can view pending repair reports');
        }

        let query = {
            status: 'PENDING',
            isActive: true,
            equipmentId: { $ne: null }
        };

        // If supervisor, only show reports from their area
        if (isSupervisor && !isAdmin) {
            if (!currentUser.area) {
                throw new Error('Supervisor area not defined');
            }
            query.location = currentUser.area._id;
        }

        const reports = await EquipmentRepairReport.find(query)
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('location')
            .sort({ reportDate: -1 });

        return reports.filter(report => report.equipmentId != null);
    },

    equipmentRepairReportsByCreator: async (_, { createdBy }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        // Jika tidak ada createdBy parameter, gunakan user yang sedang login
        const targetUserId = createdBy || user.userId;

        // User hanya bisa melihat laporan mereka sendiri kecuali admin
        const currentUser = await User.findById(user.userId).populate('role');
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.roleCode);

        if (!isAdmin && targetUserId !== user.userId) {
            throw new Error('Unauthorized to view reports from other users');
        }

        const reports = await EquipmentRepairReport.find({
            reportedBy: targetUserId,
            isActive: true,
            equipmentId: { $ne: null }
        })
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location')
            .populate('statusHistory.changedBy')
            .sort({ reportDate: -1 });

        return reports.filter(report => report.equipmentId != null);
    },

    myEquipmentRepairReports: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const reports = await EquipmentRepairReport.find({
            reportedBy: user.userId,
            isActive: true,
            equipmentId: { $ne: null } // Filter out reports with null equipmentId
        })
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location')
            .populate('statusHistory.changedBy')
            .sort({ reportDate: -1 });

        // Filter out reports where equipment population failed (equipment was deleted)
        return reports.filter(report => report.equipmentId != null);
    }
};

const Mutation = {
    createEquipmentRepairReport: async (_, { input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        // Verifikasi user adalah PMCOW atau admin
        const currentUser = await User.findById(user.userId).populate('role');
        const allowedRoles = ['PMCOW', 'ADMIN', 'SUPERADMIN'];
        if (!allowedRoles.includes(currentUser.role.roleCode)) {
            throw new Error('Only PMCOW or admin can create repair reports');
        }

        // Verifikasi equipment exists
        const equipment = await Equipment.findById(input.equipmentId);
        if (!equipment) throw new Error('Equipment not found');

        // Verifikasi area exists
        const area = await Area.findById(input.location);
        if (!area) throw new Error('Area not found');

        const report = new EquipmentRepairReport({
            ...input,
            reportedBy: user.userId
        });

        const savedReport = await report.save();

        // Update equipment status to REPAIR if damage is serious
        if (['BERAT', 'TOTAL'].includes(input.damageLevel)) {
            equipment.serviceStatus = 'REPAIR';
            await equipment.save();
        }

        return EquipmentRepairReport.findById(savedReport._id)
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('location');
    },

    updateEquipmentRepairReport: async (_, { id, input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const report = await EquipmentRepairReport.findById(id);
        if (!report) throw new Error('Report not found');

        // Hanya pelapor yang bisa update laporan yang masih pending
        if (report.reportedBy.toString() !== user.userId || report.status !== 'PENDING') {
            throw new Error('Cannot update this report');
        }

        const updatedReport = await EquipmentRepairReport.findByIdAndUpdate(
            id,
            input,
            { new: true }
        )
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location');

        return updatedReport;
    },

    reviewEquipmentRepairReport: async (_, { id, input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const report = await EquipmentRepairReport.findById(id).populate('location');
        if (!report) throw new Error('Report not found');

        if (report.status !== 'PENDING') {
            throw new Error('Report has already been reviewed');
        }

        // Check authorization: admin, superadmin, or supervisor in same area
        const currentUser = await User.findById(user.userId).populate(['role', 'area']);
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.roleCode);

        if (!isAdmin) {
            // Check if user is supervisor in the same area as the report
            const isSupervisor = currentUser.role.roleCode === 'SUPERVISOR';

            if (!isSupervisor) {
                throw new Error('Only admin or supervisor can review repair reports');
            }

            // Check if supervisor is in the same area as the repair report
            if (!currentUser.area || !report.location) {
                throw new Error('User area or report location not defined');
            }

            if (currentUser.area._id.toString() !== report.location._id.toString()) {
                throw new Error('Supervisor can only review repair reports from their assigned area');
            }
        }

        // Update report
        const updateData = {
            ...input,
            reviewedBy: user.userId,
            reviewDate: new Date()
        };

        const updatedReport = await EquipmentRepairReport.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        )
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location');

        // Update equipment status based on approval
        const equipment = await Equipment.findById(report.equipmentId);
        if (input.status === 'APPROVED') {
            equipment.serviceStatus = 'REPAIR';
        } else if (input.status === 'REJECTED') {
            // Kembalikan status ke ACTIVE jika ringan, atau tetap REPAIR jika berat
            if (['RINGAN', 'SEDANG'].includes(report.damageLevel)) {
                equipment.serviceStatus = 'ACTIVE';
            }
        }
        await equipment.save();

        return updatedReport;
    },

    updateRepairProgress: async (_, { id, input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const report = await EquipmentRepairReport.findById(id).populate('location');
        if (!report) throw new Error('Report not found');

        if (!['APPROVED', 'IN_REPAIR'].includes(report.status)) {
            throw new Error('Cannot update progress for this report status');
        }

        // Check authorization: admin, superadmin, or supervisor in same area
        const currentUser = await User.findById(user.userId).populate(['role', 'area']);
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.roleCode);

        if (!isAdmin) {
            // Check if user is supervisor in the same area as the report
            const isSupervisor = currentUser.role.roleCode === 'SUPERVISOR';

            if (!isSupervisor) {
                throw new Error('Only admin or supervisor can update repair progress');
            }

            // Check if supervisor is in the same area as the repair report
            if (!currentUser.area || !report.location) {
                throw new Error('User area or report location not defined');
            }

            if (currentUser.area._id.toString() !== report.location._id.toString()) {
                throw new Error('Supervisor can only update repair progress for reports from their assigned area');
            }
        }

        const updatedReport = await EquipmentRepairReport.findByIdAndUpdate(
            id,
            input,
            { new: true }
        )
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location');

        // Update equipment status based on repair completion
        if (input.status === 'COMPLETED') {
            const equipment = await Equipment.findById(report.equipmentId);
            equipment.serviceStatus = 'ACTIVE';
            await equipment.save();
        }

        return updatedReport;
    },

    deleteEquipmentRepairReport: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const report = await EquipmentRepairReport.findById(id);
        if (!report) throw new Error('Report not found');

        // Hanya pelapor atau admin yang bisa delete
        const currentUser = await User.findById(user.userId).populate('role');
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.roleCode);
        const isReporter = report.reportedBy.toString() === user.userId;

        if (!isAdmin && !isReporter) {
            throw new Error('Unauthorized to delete this report');
        }

        // Soft delete
        await EquipmentRepairReport.findByIdAndUpdate(id, { isActive: false });
        return true;
    }
};

const EquipmentRepairReportResolvers = {
    id: (parent) => parent._id || parent.id,
    equipment: async (parent) => {
        if (parent.equipmentId && typeof parent.equipmentId === 'object') {
            return parent.equipmentId;
        }

        if (!parent.equipmentId) {
            throw new Error(`Equipment ID is missing for repair report ${parent._id}`);
        }

        const equipment = await Equipment.findById(parent.equipmentId);
        if (!equipment) {
            throw new Error(`Equipment with ID ${parent.equipmentId} not found for repair report ${parent._id}`);
        }

        return equipment;
    },
    reportedBy: async (parent) => {
        if (parent.reportedBy && typeof parent.reportedBy === 'object') {
            return parent.reportedBy;
        }
        return User.findById(parent.reportedBy);
    },
    reviewedBy: async (parent) => {
        if (!parent.reviewedBy) return null;
        if (typeof parent.reviewedBy === 'object') {
            return parent.reviewedBy;
        }
        return User.findById(parent.reviewedBy);
    },
    location: async (parent) => {
        if (!parent.location) return null;

        // Jika location sudah berupa object (populate berhasil)
        if (typeof parent.location === 'object' && parent.location._id) {
            return parent.location;
        }

        // Jika location adalah ObjectId string, cari area
        if (typeof parent.location === 'string' && parent.location.length === 24 && mongoose.isValidObjectId(parent.location)) {
            try {
                return await Area.findById(parent.location);
            } catch (error) {
                console.error('Error finding area:', error);
                return null;
            }
        }

        // Jika location adalah string biasa (data lama), return null
        if (typeof parent.location === 'string') {
            console.warn(`Legacy string location found: ${parent.location} for report ${parent._id}`);
            return null;
        }

        return null;
    },
    statusHistory: async (parent) => {
        if (!parent.statusHistory) return [];
        return parent.statusHistory.map(history => ({
            ...history.toObject(),
            changedBy: history.changedBy
        }));
    }
};

const RepairStatusHistoryResolvers = {
    changedBy: async (parent) => {
        if (parent.changedBy && typeof parent.changedBy === 'object') {
            return parent.changedBy;
        }
        return User.findById(parent.changedBy);
    }
};

module.exports = {
    Query,
    Mutation,
    EquipmentRepairReport: EquipmentRepairReportResolvers,
    RepairStatusHistory: RepairStatusHistoryResolvers
}; 