const mongoose = require("mongoose")
const { Schema } = mongoose

const productCategorySchema = Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
  },
  parent_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory',
    default: null,
    required: false,
  },
  category_img: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
},
  {
    timestamps: true
  })




module.exports = mongoose.model("ProductCategory", productCategorySchema)