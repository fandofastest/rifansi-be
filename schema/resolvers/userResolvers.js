const { User, PersonnelRole } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Query = {
    me: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const currentUser = await User.findById(user.userId);
        if (!currentUser) throw new Error('User not found');
        return currentUser;
    },

    users: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const users = await User.find();
        return users.filter(user =>
            user.username &&
            user.fullName &&
            user.role &&
            user.email
        );
    },

    user: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return User.findById(id);
    }
};

const Mutation = {
    register: async (_, { username, password, fullName, role, email, phone }) => {
        try {
            const personnelRole = await PersonnelRole.findOne({ roleCode: role });
            if (!personnelRole) {
                throw new Error(`Role with code ${role} not found`);
            }

            const existingUser = await User.findOne({ username });
            if (existingUser) {
                throw new Error('Username already exists');
            }

            const user = new User({
                username,
                passwordHash: password,
                fullName,
                role: personnelRole._id,
                email,
                phone
            });

            await user.save();
            await user.populate('role');

            const token = jwt.sign(
                { userId: user.id, roleCode: personnelRole.roleCode },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            return { token, user };
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    login: async (_, { username, password }) => {
        try {
            const user = await User.findOne({ username });
            if (!user) throw new Error('Invalid credentials');
            if (!user.passwordHash) throw new Error('User password not set');

            const valid = await user.comparePassword(password);
            if (!valid) throw new Error('Invalid credentials');

            if (typeof user.role === 'string') {
                const roleMapping = {
                    'superadmin': 'SUPERADMIN',
                    'admin': 'ADMIN',
                    'mandor': 'MANDOR',
                    'supervisor': 'SUPERVISOR',
                    'user': 'USER'
                };

                const roleCode = roleMapping[user.role.toLowerCase()] || 'USER';
                const personnelRole = await PersonnelRole.findOne({ roleCode });

                if (personnelRole) {
                    user.role = personnelRole._id;
                    await user.save();
                } else {
                    console.error(`Role ${roleCode} not found for user ${username}`);
                    throw new Error('User role configuration error');
                }
            }

            await user.populate('role');

            if (!user.role || !user.role.roleCode) {
                const defaultRole = await PersonnelRole.findOne({ roleCode: 'USER' });
                if (defaultRole) {
                    user.role = defaultRole._id;
                    await user.save();
                    await user.populate('role');
                }
            }

            user.lastLogin = new Date();
            await user.save();

            if (!user.role || typeof user.role !== 'object' || !user.role.roleCode) {
                console.error(`Role still not properly populated for user ${username}:`, user.role);
                user.role = {
                    _id: "default",
                    roleCode: "USER",
                    roleName: "Regular User",
                    description: "Default role"
                };
            }

            const token = jwt.sign(
                { userId: user.id, roleCode: user.role.roleCode },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            return { token, user };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    updateUser: async (_, { id, username, password, fullName, role, email, phone }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const existingUser = await User.findById(id);
        if (!existingUser) throw new Error('User not found');

        const updateData = {};
        if (username) updateData.username = username;
        if (fullName) updateData.fullName = fullName;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;

        if (role) {
            const personnelRole = await PersonnelRole.findOne({ roleCode: role });
            if (!personnelRole) throw new Error(`Role ${role} not found`);
            updateData.role = personnelRole._id;
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.passwordHash = await bcrypt.hash(password, salt);
        }

        return User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('role');
    },

    deleteUser: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await User.findByIdAndDelete(id);
        return true;
    },

    updateMyProfile: async (_, { fullName, email, phone }, { user }) => {
        try {
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Cari user berdasarkan ID
            const currentUser = await User.findById(user.userId);
            if (!currentUser) {
                throw new Error('User tidak ditemukan');
            }

            // Validasi email jika diubah
            if (email && email !== currentUser.email) {
                const emailExists = await User.findOne({ email });
                if (emailExists) {
                    throw new Error('Email sudah digunakan oleh user lain');
                }
            }

            // Validasi format email
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error('Format email tidak valid');
            }

            // Validasi nomor telepon
            if (phone && !/^[0-9+\-\s()]{8,15}$/.test(phone)) {
                throw new Error('Format nomor telepon tidak valid');
            }

            // Update data
            const updateData = {};
            if (fullName) updateData.fullName = fullName;
            if (email) updateData.email = email;
            if (phone) updateData.phone = phone;

            // Update user
            const updatedUser = await User.findByIdAndUpdate(
                user.userId,
                updateData,
                {
                    new: true,
                    runValidators: true
                }
            ).populate('role');

            if (!updatedUser) {
                throw new Error('Gagal memperbarui profil');
            }

            return {
                success: true,
                message: 'Profil berhasil diperbarui',
                user: updatedUser
            };
        } catch (error) {
            console.error('Error in updateMyProfile:', error);
            return {
                success: false,
                message: error.message || 'Terjadi kesalahan saat memperbarui profil',
                user: null
            };
        }
    },

    changeMyPassword: async (_, { currentPassword, newPassword }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const currentUser = await User.findById(user.userId);
        if (!currentUser) throw new Error('User not found');

        const isMatch = await currentUser.comparePassword(currentPassword);
        if (!isMatch) {
            return {
                success: false,
                message: 'Current password is incorrect'
            };
        }

        currentUser.passwordHash = newPassword;
        await currentUser.save();

        return {
            success: true,
            message: 'Password changed successfully'
        };
    },

    updatePassword: async (_, { currentPassword, newPassword }, { user }) => {
        try {
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Cari user berdasarkan ID
            const currentUser = await User.findById(user.userId);
            if (!currentUser) {
                throw new Error('User tidak ditemukan');
            }

            // Verifikasi password lama menggunakan method comparePassword
            const isPasswordValid = await currentUser.comparePassword(currentPassword);
            if (!isPasswordValid) {
                throw new Error('Password saat ini tidak valid');
            }

            // Validasi password baru
            if (newPassword.length < 6) {
                throw new Error('Password baru minimal 6 karakter');
            }

            // Update password menggunakan setter dari model
            currentUser.passwordHash = newPassword;
            await currentUser.save();

            return {
                success: true,
                message: 'Password berhasil diperbarui',
                user: currentUser
            };
        } catch (error) {
            console.error('Error in updatePassword:', error);
            return {
                success: false,
                message: error.message || 'Terjadi kesalahan saat memperbarui password',
                user: null
            };
        }
    }
};

const UserResolvers = {
    id: (parent) => parent._id || parent.id,
    role: async (parent) => {
        if (parent.role && typeof parent.role === 'object' && parent.role.roleCode) {
            return {
                ...parent.role,
                id: parent.role._id,
                roleCode: parent.role.roleCode,
                roleName: parent.role.roleName,
                description: parent.role.description,
                createdAt: parent.role.createdAt,
                updatedAt: parent.role.updatedAt
            };
        }

        if (parent.role && mongoose.isValidObjectId(parent.role)) {
            const roleDoc = await PersonnelRole.findById(parent.role);
            if (roleDoc) {
                return {
                    ...roleDoc.toObject(),
                    id: roleDoc._id,
                };
            }
        }

        return {
            id: "default",
            roleCode: "USER",
            roleName: "Regular User",
            description: "Default role"
        };
    }
};

const AuthPayload = {
    user: (parent) => parent.user
};

module.exports = {
    Query,
    Mutation,
    User: UserResolvers,
    AuthPayload
}; 