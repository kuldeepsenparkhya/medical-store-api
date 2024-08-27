const mongoose = require("mongoose")
const { Schema } = mongoose

const addToCartSchema = Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    products: [{
        product_ID: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref:'Product'
        },
        product_variant_ID: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true,
            default: 0
        }
    }],
},
    {
        timestamps: true
    })


module.exports = mongoose.model("AddToCart", addToCartSchema)