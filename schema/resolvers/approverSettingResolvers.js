const { User, Report } = require('../../models');

const Query = {
    // These queries are deprecated since approval is now area-based
    // keeping them for backward compatibility but they will return empty/null

    approverSettings: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        console.log('Warning: approverSettings query is deprecated. Approval is now area-based.');
        return [];
    },

    approverSetting: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        console.log('Warning: approverSetting query is deprecated. Approval is now area-based.');
        return null;
    },

    getUserApprover: async (_, { userId }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        console.log('Warning: getUserApprover query is deprecated. Approval is now area-based.');
        return null;
    },

    getApproverUsers: async (_, { approverId }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        console.log('Warning: getApproverUsers query is deprecated. Approval is now area-based.');
        return [];
    }
};

const Mutation = {
    // Approver setting mutations are deprecated
    createApproverSetting: async (_, { input }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        throw new Error('ApproverSetting is deprecated. Approval is now based on area. Users with SUPERVISOR or MANDOR roles can approve reports in their assigned area.');
    },

    updateApproverSetting: async (_, { id, isActive }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        throw new Error('ApproverSetting is deprecated. Approval is now based on area. Users with SUPERVISOR or MANDOR roles can approve reports in their assigned area.');
    },

    deleteApproverSetting: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        throw new Error('ApproverSetting is deprecated. Approval is now based on area. Users with SUPERVISOR or MANDOR roles can approve reports in their assigned area.');
    },

    getApproverByUser: async (_, { userId }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        console.log('Warning: getApproverByUser is deprecated. Approval is now area-based.');
        return null;
    },

    // Report approval functions - updated to work with area-based approval
    approveReport: async (_, { reportId }, { user }) => {
        try {
            if (!user) throw new Error('Not authenticated');

            // Check if user is admin, superadmin, supervisor, or mandor
            const currentUser = await User.findById(user.userId).populate(['role', 'area']);
            if (!currentUser) throw new Error('User not found');

            const isAdmin = currentUser.role && (currentUser.role.roleCode === 'ADMIN' || currentUser.role.roleCode === 'SUPERADMIN');
            const canApprove = currentUser.role && (
                currentUser.role.roleCode === 'SUPERVISOR' ||
                currentUser.role.roleCode === 'MANDOR'
            );

            if (!isAdmin && !canApprove) {
                throw new Error('Only admin, superadmin, supervisor, and mandor can approve reports');
            }

            // If not admin/superadmin, check area-based approval
            if (!isAdmin) {
                const report = await Report.findById(reportId).populate('areaId');
                if (!report) throw new Error('Report not found');

                if (!currentUser.area || !report.areaId) {
                    throw new Error('User area or report area not specified');
                }

                if (currentUser.area._id.toString() !== report.areaId._id.toString()) {
                    throw new Error('You can only approve reports from your assigned area');
                }
            }

            const report = await Report.findByIdAndUpdate(
                reportId,
                {
                    status: 'APPROVED',
                    approvedBy: user.userId,
                    approvedAt: new Date()
                },
                { new: true }
            );

            if (!report) throw new Error('Report not found');
            return report;
        } catch (error) {
            console.error('Error in approveReport:', error);
            throw error;
        }
    },

    // Reject report function - updated to work with area-based approval
    rejectReport: async (_, { reportId, reason }, { user }) => {
        try {
            if (!user) throw new Error('Not authenticated');

            // Check if user is admin, superadmin, supervisor, or mandor
            const currentUser = await User.findById(user.userId).populate(['role', 'area']);
            if (!currentUser) throw new Error('User not found');

            const isAdmin = currentUser.role && (currentUser.role.roleCode === 'ADMIN' || currentUser.role.roleCode === 'SUPERADMIN');
            const canApprove = currentUser.role && (
                currentUser.role.roleCode === 'SUPERVISOR' ||
                currentUser.role.roleCode === 'MANDOR'
            );

            if (!isAdmin && !canApprove) {
                throw new Error('Only admin, superadmin, supervisor, and mandor can reject reports');
            }

            // If not admin/superadmin, check area-based approval
            if (!isAdmin) {
                const report = await Report.findById(reportId).populate('areaId');
                if (!report) throw new Error('Report not found');

                if (!currentUser.area || !report.areaId) {
                    throw new Error('User area or report area not specified');
                }

                if (currentUser.area._id.toString() !== report.areaId._id.toString()) {
                    throw new Error('You can only reject reports from your assigned area');
                }
            }

            const report = await Report.findByIdAndUpdate(
                reportId,
                {
                    status: 'REJECTED',
                    rejectedBy: user.userId,
                    rejectedAt: new Date(),
                    rejectionReason: reason
                },
                { new: true }
            );

            if (!report) throw new Error('Report not found');
            return report;
        } catch (error) {
            console.error('Error in rejectReport:', error);
            throw error;
        }
    },

    // Delete report function - kept as is for admin/superadmin
    deleteReport: async (_, { reportId }, { user }) => {
        try {
            if (!user) throw new Error('Not authenticated');

            // Only admin and superadmin can delete reports
            const currentUser = await User.findById(user.userId).populate('role');
            if (!currentUser) throw new Error('User not found');

            const isAdmin = currentUser.role && (currentUser.role.roleCode === 'ADMIN' || currentUser.role.roleCode === 'SUPERADMIN');

            if (!isAdmin) {
                throw new Error('Only admin and superadmin can delete reports');
            }

            const report = await Report.findByIdAndDelete(reportId);
            if (!report) throw new Error('Report not found');
            return true;
        } catch (error) {
            console.error('Error in deleteReport:', error);
            throw error;
        }
    }
};

// Type Resolver - deprecated but kept for backward compatibility
const ApproverSettingResolvers = {
    userId: async (parent) => {
        console.log('Warning: ApproverSetting resolvers are deprecated. Approval is now area-based.');
        return null;
    },
    approverId: async (parent) => {
        console.log('Warning: ApproverSetting resolvers are deprecated. Approval is now area-based.');
        return null;
    },
    createdBy: async (parent) => {
        console.log('Warning: ApproverSetting resolvers are deprecated. Approval is now area-based.');
        return null;
    },
    lastUpdatedBy: async (parent) => {
        console.log('Warning: ApproverSetting resolvers are deprecated. Approval is now area-based.');
        return null;
    }
};

module.exports = {
    Query,
    Mutation,
    ApproverSetting: ApproverSettingResolvers
}; 