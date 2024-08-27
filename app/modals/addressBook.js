const mongoose = require("mongoose")
const { Schema } = mongoose

const addressBookSchema = Schema({
  bill_to: {
    type: String,
  },
  address: {
    type: String,
  },
  land_mark: {
    type: String,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
  pincode: {
    type: String,
  },
  address_type: {
    type: String,
    enum: ['home', 'office', 'other'],
  },
  latitude: {
    type: String,
  },
  longitude: {
    type: String,
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
},
  {
    timestamps: true
  })



module.exports = mongoose.model("AddressBook", addressBookSchema)