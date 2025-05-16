const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
    rate: {
        type: Number,
        required: true
    },
    description: {
        type: String
    }
}, { _id: false });

const workItemSchema = new mongoose.Schema({
    workItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkItem',
        required: true
    },
    boqVolume: {
        type: {
            nr: {
                type: Number,
                required: true,
                default: 0
            },
            r: {
                type: Number,
                required: true,
                default: 0
            }
        },
        required: true,
        default: () => ({ nr: 0, r: 0 })
    },
    amount: {
        type: Number,
        default: function() {
            return (this.boqVolume.nr * this.rates.nr.rate) + 
                   (this.boqVolume.r * this.rates.r.rate);
        }
    },
    rates: {
        nr: rateSchema,
        r: rateSchema
    },
    description: {
        type: String,
        trim: true
    }
}, { _id: false });

const spkSchema = new mongoose.Schema({
    spkNo: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    wapNo: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    projectName: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    contractor: {
        type: String,
        required: true,
        trim: true
    },
    workDescription: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area'
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    budget: {
        type: Number,
        required: true
    },
    workItems: [workItemSchema]
}, {
    timestamps: true
});

// Middleware untuk update updatedAt
spkSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes
spkSchema.index({ spkNo: 1 }, { unique: true });
spkSchema.index({ wapNo: 1 });
spkSchema.index({ projectName: 1 });
spkSchema.index({ date: -1 });
spkSchema.index({ contractor: 1 });
spkSchema.index({ location: 1 });
spkSchema.index({ startDate: 1 });
spkSchema.index({ endDate: 1 });
spkSchema.index({ 'workItems.workItemId': 1 });

const SPK = mongoose.model('SPK', spkSchema);

module.exports = SPK; 