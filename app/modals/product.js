const mongoose = require("mongoose")
const { Schema } = mongoose
const productSchema = Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  sku: {
    type: String,
    trim: true,
    set: (val) => val.toUpperCase(), // Converts name to uppercase before saving
  },
  consume_type: {
    type: String,
  },
  return_policy: {
    type: String,
  },
  product_category_id: {
    type: Schema.Types.ObjectId,
    ref: 'ProductCategory',
    required: true
  },
  health_category_id: {
    type: Schema.Types.ObjectId,
    ref: 'HealthCategory',
  },
  brand_id: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  expiry_date: {
    type: Date,
  },
  manufacturing_date: {
    type: Date,
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  sideEffects: {
    type: [String],
    default: [],
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isRequirePrescription: {
    type: Boolean,
    default: false,
  },
},
  {
    timestamps: true
  })
// Add indexes for frequently queried fields
productSchema.index({ title: 1 });
productSchema.index({ price: 1 });
productSchema.index({ product_category_id: 1 });
module.exports = mongoose.model("Product", productSchema)