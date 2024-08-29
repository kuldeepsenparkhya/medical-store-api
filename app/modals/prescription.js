
const mongoose = require("mongoose")
const { Schema } = mongoose

const prescriptionSchema = Schema({
    url: {
        type: String,
    },
    mimetype: {
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
    status: {
        type: String,
        enum: ['approved', 'rejected', 'pending'],
    },

}, {
    timestamps: true
})

module.exports = mongoose.model("Prescription", prescriptionSchema)