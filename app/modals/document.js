const mongoose = require("mongoose")
const bcrypt = require("bcrypt");
const { Schema } = mongoose

const documentSchema = Schema({
  type: {
    type: String,
    enum: ['privacy_policy', 'contact_us', 'terms_of_conditions', 'data_deletion_instructions'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
},
  {
    timestamps: true
  })


module.exports = mongoose.model("Document", documentSchema)