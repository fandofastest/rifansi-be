const { EquipmentRepairReport, Equipment, User, Area } = require('../../models');
const mongoose = require('mongoose');

const Query = {
    equipmentRepairReports: async (_, { status, equipmentId, reportedBy }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const query = { isActive: true };
        if (status) query.status = status;
        if (equipmentId) query.equipmentId = equipmentId;
        if (reportedBy) query.reportedBy = reportedBy;

        // PMCOW hanya bisa melihat laporan mereka sendiri
        const currentUser = await User.findById(user.userId).populate('role');
        if (currentUser.role.roleCode === 'PMCOW') {
            query.reportedBy = user.userId;
        }

        return EquipmentRepairReport.find(query)
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location')
            .populate('statusHistory.changedBy')
            .sort({ reportDate: -1 });
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

        // Hanya admin yang bisa melihat pending reports
        const currentUser = await User.findById(user.userId).populate('role');
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.roleCode);
        
        if (!isAdmin) {
            throw new Error('Only admin can view pending repair reports');
        }

        return EquipmentRepairReport.find({ 
            status: 'PENDING', 
            isActive: true 
        })
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('location')
            .sort({ reportDate: -1 });
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

        return EquipmentRepairReport.find({ 
            reportedBy: targetUserId, 
            isActive: true 
        })
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location')
            .populate('statusHistory.changedBy')
            .sort({ reportDate: -1 });
    },

    myEquipmentRepairReports: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');

        return EquipmentRepairReport.find({ 
            reportedBy: user.userId, 
            isActive: true 
        })
            .populate('equipmentId')
            .populate('reportedBy')
            .populate('reviewedBy')
            .populate('location')
            .populate('statusHistory.changedBy')
            .sort({ reportDate: -1 });
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

        // Hanya admin yang bisa review
        const currentUser = await User.findById(user.userId).populate('role');
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.roleCode);
        
        if (!isAdmin) {
            throw new Error('Only admin can review repair reports');
        }

        const report = await EquipmentRepairReport.findById(id);
        if (!report) throw new Error('Report not found');

        if (report.status !== 'PENDING') {
            throw new Error('Report has already been reviewed');
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

        // Hanya admin yang bisa update progress
        const currentUser = await User.findById(user.userId).populate('role');
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role.roleCode);
        
        if (!isAdmin) {
            throw new Error('Only admin can update repair progress');
        }

        const report = await EquipmentRepairReport.findById(id);
        if (!report) throw new Error('Report not found');

        if (!['APPROVED', 'IN_REPAIR'].includes(report.status)) {
            throw new Error('Cannot update progress for this report status');
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
        return Equipment.findById(parent.equipmentId);
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