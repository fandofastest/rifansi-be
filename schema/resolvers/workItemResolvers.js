const { WorkItem, Category, SubCategory, Unit } = require('../../models');

const Query = {
    workItems: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const workItems = await WorkItem.find()
            .populate('categoryId')
            .populate('subCategoryId')
            .populate('unitId');

        return workItems.map(item => ({
            ...item.toObject(),
            id: item._id,
            categoryId: item.categoryId?._id,
            subCategoryId: item.subCategoryId?._id,
            unitId: item.unitId?._id,
            category: item.categoryId ? {
                id: item.categoryId._id,
                name: item.categoryId.name
            } : null,
            subCategory: item.subCategoryId ? {
                id: item.subCategoryId._id,
                name: item.subCategoryId.name
            } : null,
            unit: item.unitId ? {
                id: item.unitId._id,
                name: item.unitId.name
            } : null
        }));
    },

    workItem: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const workItem = await WorkItem.findById(id)
            .populate('categoryId')
            .populate('subCategoryId')
            .populate('unitId');

        if (!workItem) return null;

        return {
            ...workItem.toObject(),
            id: workItem._id,
            categoryId: workItem.categoryId?._id,
            subCategoryId: workItem.subCategoryId?._id,
            unitId: workItem.unitId?._id,
            category: workItem.categoryId ? {
                id: workItem.categoryId._id,
                name: workItem.categoryId.name
            } : null,
            subCategory: workItem.subCategoryId ? {
                id: workItem.subCategoryId._id,
                name: workItem.subCategoryId.name
            } : null,
            unit: workItem.unitId ? {
                id: workItem.unitId._id,
                name: workItem.unitId.name
            } : null
        };
    }
};

const Mutation = {
    createWorkItem: async (_, { input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        if (input.categoryId) {
            const categoryExists = await Category.findById(input.categoryId);
            if (!categoryExists) throw new Error('Category not found');
        }

        if (input.subCategoryId) {
            const subCategoryExists = await SubCategory.findById(input.subCategoryId);
            if (!subCategoryExists) throw new Error('SubCategory not found');
        }

        if (input.unitId) {
            const unitExists = await Unit.findById(input.unitId);
            if (!unitExists) throw new Error('Unit not found');
        }

        const workItem = new WorkItem(input);
        await workItem.save();

        return workItem.populate(['categoryId', 'subCategoryId', 'unitId']);
    },

    updateWorkItem: async (_, { id, input }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        if (input.categoryId) {
            const categoryExists = await Category.findById(input.categoryId);
            if (!categoryExists) throw new Error('Category not found');
        }

        if (input.subCategoryId) {
            const subCategoryExists = await SubCategory.findById(input.subCategoryId);
            if (!subCategoryExists) throw new Error('SubCategory not found');
        }

        if (input.unitId) {
            const unitExists = await Unit.findById(input.unitId);
            if (!unitExists) throw new Error('Unit not found');
        }

        const workItem = await WorkItem.findByIdAndUpdate(
            id,
            { $set: input },
            { new: true }
        ).populate(['categoryId', 'subCategoryId', 'unitId']);

        if (!workItem) throw new Error('WorkItem not found');

        return workItem;
    },

    deleteWorkItem: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const result = await WorkItem.findByIdAndDelete(id);
        return !!result;
    }
};

const WorkItemResolvers = {
    category: async (parent) => {
        if (!parent.categoryId) return null;
        return Category.findById(parent.categoryId);
    },
    subCategory: async (parent) => {
        if (!parent.subCategoryId) return null;
        return SubCategory.findById(parent.subCategoryId);
    },
    unit: async (parent) => {
        if (!parent.unitId) return null;
        return Unit.findById(parent.unitId);
    }
};

module.exports = {
    Query,
    Mutation,
    WorkItem: WorkItemResolvers
}; 