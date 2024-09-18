const mongoose = require("mongoose")
const { Schema } = mongoose

const healthCategorySchema = Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  icon: {
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




module.exports = mongoose.model("HealthCategory", healthCategorySchema)