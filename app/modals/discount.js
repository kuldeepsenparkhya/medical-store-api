const mongoose = require('mongoose');
const { Schema } = mongoose;

const productOfferSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  discount: {
    type: Number,
    required: true
  },
  discount_img: {
    type: String,
  },
  discount_type: {
    type: String,
    enum: ['perc', 'amount'],
    required: true
  },
  discount_offer_type: {
    type: String,
    enum: ['combo', 'single'],
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

module.exports = mongoose.model('Discount', productOfferSchema);
