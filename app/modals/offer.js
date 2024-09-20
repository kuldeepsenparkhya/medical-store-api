
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
    },
    discount: {
        type: Number,
    },
    discount_type: {
        type: String,
    },
}, {
    timestamps: true
})

module.exports = mongoose.model("Offer", offerSchema)