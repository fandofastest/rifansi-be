const { PersonnelRole, SalaryComponent } = require('../../models');
const mongoose = require('mongoose');

const Query = {
    personnelRoles: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return PersonnelRole.find();
    },
    personnelRole: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return PersonnelRole.findById(id);
    }
};

const Mutation = {
    createPersonnelRole: async (_, { roleCode, roleName, description, isPersonel }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const personnelRole = new PersonnelRole({
            roleCode,
            roleName,
            description,
            isPersonel: isPersonel !== undefined ? isPersonel : true
        });
        return personnelRole.save();
    },
    updatePersonnelRole: async (_, { id, roleCode, roleName, description, isPersonel }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const updateData = {};
        if (roleCode !== undefined) updateData.roleCode = roleCode;
        if (roleName !== undefined) updateData.roleName = roleName;
        if (description !== undefined) updateData.description = description;
        if (isPersonel !== undefined) updateData.isPersonel = isPersonel;
        return PersonnelRole.findByIdAndUpdate(id, updateData, { new: true });
    },
    deletePersonnelRole: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await PersonnelRole.findByIdAndDelete(id);
        return true;
    }
};

const PersonnelRoleResolvers = {
    id: (parent) => parent._id || parent.id,
    salaryComponent: async (parent) => {
        if (!parent._id && !parent.id) return null;

        const roleId = parent._id || parent.id;
        if (!mongoose.isValidObjectId(roleId)) return null;

        try {
            return await SalaryComponent.findOne({ personnelRole: roleId });
        } catch (error) {
            console.error('Error fetching salary component:', error);
            return null;
        }
    },
    isPersonel: (parent) => {
        return parent.isPersonel !== undefined ? parent.isPersonel : true;
    }
};

module.exports = {
    Query,
    Mutation,
    PersonnelRole: PersonnelRoleResolvers
}; 