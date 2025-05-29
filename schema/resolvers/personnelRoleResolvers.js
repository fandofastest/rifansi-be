const { PersonnelRole, SalaryComponent } = require('../../models');

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
    createPersonnelRole: async (_, args, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const personnelRole = new PersonnelRole(args);
        return personnelRole.save();
    },
    updatePersonnelRole: async (_, { id, ...args }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return PersonnelRole.findByIdAndUpdate(id, args, { new: true });
    },
    deletePersonnelRole: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await PersonnelRole.findByIdAndDelete(id);
        return true;
    }
};

const PersonnelRoleResolvers = {
    salaryComponent: async (parent) => {
        return SalaryComponent.findOne({ personnelRole: parent._id || parent.id });
    }
};

module.exports = {
    Query,
    Mutation,
    PersonnelRole: PersonnelRoleResolvers
}; 