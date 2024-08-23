const mongoose = require("mongoose")
const { Schema } = mongoose



const mediaSchema = new Schema({
  url: {
    type: String,
  },
  mimetype: {
    type: String,
  },

}, { _id: false });



const productSchema = Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  sku: String, // Stock Keeping Unit
  price: {
    type: Number,
    required: true,
  },
  discounted_price: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
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
  media: [mediaSchema],
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

  attributes: {
    type: Map,
    of: String // Key-value pairs for various attributes (e.g., color, size)
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