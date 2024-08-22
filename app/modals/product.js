const mongoose = require("mongoose")
const { Schema } = mongoose

const productSchema = Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  discounted_price: {
    type: String,
    required: true,
  },
  quantity: {
    type: String,
    required: true,
  },
  consume_type: {
    type: String,
    required: true,
    enum: ['oral', 'topical', 'inhaled', 'sublingual', 'rectal', 'injection', 'nasal'],
  },
  return_policy: {
    type: String,
    required: true,
  },
  product_category_id: {
    type: Schema.Types.ObjectId,
    ref: 'ProductCategory',
    required: true
  },
  brand_id: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  media: {
    type: String,
    required: true,
  },
  expiry_date: {
    type: Date,
    required: true,
  },
  manufacturing_date: {
    type: Date,
    required: true,
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  sideEffects: {
    type: [String],
    default: [],
  },
},
  {
    timestamps: true
  })




module.exports = mongoose.model("Product", productSchema)