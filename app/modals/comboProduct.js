const mongoose = require("mongoose")
const { Schema } = mongoose

const comboproductSchema = Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  product_variant_id: {
    type: Schema.Types.ObjectId,
    ref: 'Variant',
  },
  discount_id: {
    type: Schema.Types.ObjectId,
    ref: 'Discount',
    required: true
  },
  expiry_date: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
},
  {
    timestamps: true
  })



module.exports = mongoose.model("ComboProduct", comboproductSchema)