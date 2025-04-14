const mongoose = require("mongoose")
const { Schema } = mongoose

const brandSchema = Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    set: (val) => {
      return val.toLowerCase();
    },
  },
  description: {
    type: String,
  },
  brand_logo: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
},
  {
    timestamps: true
  });


module.exports = mongoose.model("Brand", brandSchema)