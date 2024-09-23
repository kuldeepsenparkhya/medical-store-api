
const mongoose = require("mongoose")
const { Schema } = mongoose

const offerSchema = Schema({
    title: {
        type: String,
    },
    description: {
        type: String,
    },
    validateTo: {
        type: String,
    },
    offerBanner: {
        type: String,
    },
    coupon_code: {
        type: String,
        unique: true,
    },
    discount: {
        type: Number,
    },
    discount_type: {
        type: String,
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Offer", offerSchema)