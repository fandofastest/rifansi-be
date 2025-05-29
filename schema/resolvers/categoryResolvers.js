const { Category, SubCategory } = require('../../models');

const Query = {
    categories: async (_, __, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Category.find();
    },
    category: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Category.findById(id);
    }
};

const Mutation = {
    createCategory: async (_, { code, name, description }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const category = new Category({ code, name, description });
        return category.save();
    },
    updateCategory: async (_, { id, code, name, description }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        return Category.findByIdAndUpdate(
            id,
            { code, name, description },
            { new: true }
        );
    },
    deleteCategory: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await Category.findByIdAndDelete(id);
        return true;
    }
};

const CategoryResolvers = {
    subCategories: async (parent) => {
        return SubCategory.find({ categoryId: parent.id });
    }
};

const SubCategoryResolvers = {
    category: async (parent) => {
        return Category.findById(parent.categoryId);
    }
};

module.exports = {
    Query,
    Mutation,
    Category: CategoryResolvers,
    SubCategory: SubCategoryResolvers
}; 