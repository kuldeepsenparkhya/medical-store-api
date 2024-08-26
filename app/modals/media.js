
const mongoose = require("mongoose")
const { Schema } = mongoose

const mediaSchema = Schema({
    url: {
        type: String,
    },
    mimetype: {
        type: String,
    },
    product_id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
    },

}, {
    timestamps: true
})

module.exports = mongoose.model("Media", mediaSchema)