const mongoose = require("mongoose")
const { Schema } = mongoose

const orderSchema = Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Product'
        },
        productVariantId: {
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
            min: 0
        }
    }],
    totalPrice: {
        type: Number,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'delivered',],
        default: 'pending',
        required: true,
    },
},
    {
        timestamps: true
    })


module.exports = mongoose.model("Order", orderSchema)