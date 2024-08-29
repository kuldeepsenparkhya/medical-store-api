const mongoose = require("mongoose")
const { Schema } = mongoose

const orderSchema = Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    products: [{
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Product'
        },
        product_variant_id: {
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
        enum: ['pending', 'delivered','dispatch','cancelled'],
        default: 'pending',
        required: true,
    },
},
    {
        timestamps: true
    })


module.exports = mongoose.model("Order", orderSchema)