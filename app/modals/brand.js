const mongoose = require("mongoose")
const { Schema } = mongoose

const brandSchema = Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
  },
},
  {
    timestamps: true
  });


module.exports = mongoose.model("Brand", brandSchema)