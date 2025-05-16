const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
    rate: {
        type: Number,
        required: true,
        default: 0
    },
    description: {
        type: String,
        default: ''
    }
}, { _id: false });

const workItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    subCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubCategory'
    },
    unitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Unit'
    },
    rates: {
        nr: {
            type: rateSchema,
            default: () => ({ rate: 0, description: 'Non-remote rate' })
        },
        r: {
            type: rateSchema,
            default: () => ({ rate: 0, description: 'Remote rate' })
        }
    },
    description: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true
});

// Indexes
workItemSchema.index({ name: 1 });
workItemSchema.index({ categoryId: 1 });
workItemSchema.index({ subCategoryId: 1 });

// Pre-save middleware to ensure updatedAt is set
workItemSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const WorkItem = mongoose.model('WorkItem', workItemSchema);

module.exports = WorkItem; 