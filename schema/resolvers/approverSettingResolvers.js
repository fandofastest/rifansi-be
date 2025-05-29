const { ApproverSetting, User, Report } = require('../../models');

const Query = {
    approverSettings: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return ApproverSetting.find().populate('userId approverId');
    },

    approverSetting: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return ApproverSetting.findById(id).populate('userId approverId');
    },

    // Query untuk mendapatkan approver dari user tertentu
    getUserApprover: async (_, { userId }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return ApproverSetting.findOne({
            userId,
            isActive: true
        }).populate('approverId');
    },

    // Query untuk mendapatkan daftar user yang bisa diapprove oleh approver tertentu
    getApproverUsers: async (_, { approverId }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return ApproverSetting.find({
            approverId,
            isActive: true
        }).populate('userId');
    }
};

const Mutation = {
    // Membuat setting approver baru
    createApproverSetting: async (_, { input }, { user }) => {
        try {
            console.log('createApproverSetting called with input:', input);
            if (!user) {
                console.log('Not authenticated');
                throw new Error('Not authenticated');
            }
            console.log('Current user:', user);

            // Validasi bahwa user yang melakukan setting adalah admin
            const currentUser = await User.findById(user.userId);
            console.log('Current user from DB:', currentUser);
            if (!currentUser) {
                console.log('Current user not found');
                throw new Error('Current user not found');
            }

            const isAdmin = await currentUser.isAdmin();
            console.log('Is current user admin?', isAdmin);
            if (!isAdmin) {
                console.log('User is not admin');
                throw new Error('Only admin can set approvers');
            }

            // Validasi bahwa user dan approver ada
            const [userExists, approverExists] = await Promise.all([
                User.findById(input.userId),
                User.findById(input.approverId)
            ]);
            console.log('User exists:', userExists);
            console.log('Approver exists:', approverExists);

            if (!userExists) {
                console.log('User not found');
                throw new Error('User not found');
            }
            if (!approverExists) {
                console.log('Approver not found');
                throw new Error('Approver not found');
            }

            // Cek apakah setting sudah ada
            const existingSetting = await ApproverSetting.findOne({
                userId: input.userId,
                approverId: input.approverId
            });
            console.log('Existing setting:', existingSetting);

            if (existingSetting) {
                console.log('Approver setting already exists');
                throw new Error('Approver setting already exists');
            }

            // Buat setting baru
            const approverSetting = new ApproverSetting({
                userId: input.userId,
                approverId: input.approverId,
                createdBy: user.userId,
                isActive: true
            });
            console.log('New approver setting:', approverSetting);

            // Simpan ke database
            const savedSetting = await approverSetting.save();
            console.log('Saved setting:', savedSetting);

            // Populate dan return
            const populatedSetting = await ApproverSetting.findById(savedSetting._id)
                .populate('userId')
                .populate('approverId')
                .populate('createdBy');
            console.log('Populated setting:', populatedSetting);

            if (!populatedSetting) {
                console.log('Failed to create approver setting');
                throw new Error('Failed to create approver setting');
            }

            return populatedSetting;
        } catch (error) {
            console.error('Error in createApproverSetting:', error);
            throw error;
        }
    },

    // Update status aktif/nonaktif setting
    updateApproverSetting: async (_, { id, isActive }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        // Validasi bahwa user yang melakukan update adalah admin
        const currentUser = await User.findById(user.userId);
        if (!await currentUser.isAdmin()) {
            throw new Error('Only admin can update approver settings');
        }

        const approverSetting = await ApproverSetting.findByIdAndUpdate(
            id,
            {
                isActive,
                lastUpdatedBy: user.userId
            },
            { new: true }
        ).populate('userId approverId');

        if (!approverSetting) {
            throw new Error('Approver setting not found');
        }

        return approverSetting;
    },

    // Hapus setting approver
    deleteApproverSetting: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        // Validasi bahwa user yang melakukan delete adalah admin
        const currentUser = await User.findById(user.userId);
        if (!await currentUser.isAdmin()) {
            throw new Error('Only admin can delete approver settings');
        }

        const approverSetting = await ApproverSetting.findByIdAndDelete(id);
        if (!approverSetting) {
            throw new Error('Approver setting not found');
        }

        return true;
    },

    // Mendapatkan approver berdasarkan user ID
    getApproverByUser: async (_, { userId }, { user }) => {
        try {
            if (!user) {
                console.log('Not authenticated');
                throw new Error('Not authenticated');
            }

            // Validasi bahwa user yang diminta ada
            const targetUser = await User.findById(userId);
            if (!targetUser) {
                console.log('Target user not found');
                throw new Error('User not found');
            }

            // Cari approver setting yang aktif
            const approverSetting = await ApproverSetting.findOne({
                userId,
                isActive: true
            }).populate('approverId');

            if (!approverSetting) {
                console.log('No active approver found for user');
                return null;
            }

            return approverSetting.approverId;
        } catch (error) {
            console.error('Error in getApproverByUser:', error);
            throw error;
        }
    },

    // Fungsi untuk approve laporan
    approveReport: async (_, { reportId }, { user }) => {
        try {
            if (!user) throw new Error('Not authenticated');

            // Validasi bahwa user adalah admin atau superadmin
            const currentUser = await User.findById(user.userId);
            if (!currentUser) throw new Error('User not found');

            const isAdmin = await currentUser.isAdmin();
            const isSuperAdmin = await currentUser.isSuperAdmin();

            if (!isAdmin && !isSuperAdmin) {
                throw new Error('Only admin and superadmin can approve reports');
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

    // Fungsi untuk reject laporan
    rejectReport: async (_, { reportId, reason }, { user }) => {
        try {
            if (!user) throw new Error('Not authenticated');

            // Validasi bahwa user adalah admin atau superadmin
            const currentUser = await User.findById(user.userId);
            if (!currentUser) throw new Error('User not found');

            const isAdmin = await currentUser.isAdmin();
            const isSuperAdmin = await currentUser.isSuperAdmin();

            if (!isAdmin && !isSuperAdmin) {
                throw new Error('Only admin and superadmin can reject reports');
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

    // Fungsi untuk delete laporan
    deleteReport: async (_, { reportId }, { user }) => {
        try {
            if (!user) throw new Error('Not authenticated');

            // Validasi bahwa user adalah admin atau superadmin
            const currentUser = await User.findById(user.userId);
            if (!currentUser) throw new Error('User not found');

            const isAdmin = await currentUser.isAdmin();
            const isSuperAdmin = await currentUser.isSuperAdmin();

            if (!isAdmin && !isSuperAdmin) {
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

// Type Resolver untuk ApproverSetting
const ApproverSettingResolvers = {
    userId: async (parent) => {
        return User.findById(parent.userId);
    },
    approverId: async (parent) => {
        return User.findById(parent.approverId);
    },
    createdBy: async (parent) => {
        return User.findById(parent.createdBy);
    },
    lastUpdatedBy: async (parent) => {
        if (!parent.lastUpdatedBy) return null;
        return User.findById(parent.lastUpdatedBy);
    }
};

module.exports = {
    Query,
    Mutation,
    ApproverSetting: ApproverSettingResolvers
}; 