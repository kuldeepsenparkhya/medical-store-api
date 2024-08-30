const mongoose = require('mongoose');
const { Schema } = mongoose;

const productOfferSchema = new Schema({
  discount: {
    type: Number,
    required: true
  },
  discount_type: {
    type: String,
    enum: ['perc', 'amount'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true
});

// Create a compound unique index for discount and discount_type
productOfferSchema.index({ discount: 1, discount_type: 1 }, { unique: true });

// Create model
module.exports = mongoose.model('Discount', productOfferSchema);
