const mongoose = require("mongoose")
const { Schema } = mongoose

const orderSchema = Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'

    },
    address_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'AddressBook'
    },
    products: [{
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Product'
        },
        product_variant_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Variant'
        },
        media_id: {
            type: mongoose.Schema.Types.ObjectId,
            // required: true,
            ref: 'Media',
            default: null,
            default: null,
            set: value => (value === 'null' || value === '' ? null : value)
        },
        discount_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: 'Discount'
        },
        discount: {
            type: String,
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
    subTotal: {
        type: Number,
        min: 0
    },
    shippingCost: {
        type: Number,
        min: 0
    },
    total: {
        type: Number,
        min: 0
    },
    coupon_code: {
        type: String,
    },
    status: {
        type: String,
        enum: ['pending', 'delivered', 'dispatch', 'cancelled'],
        default: 'pending',
        required: true,
    },
    order_type: {
        type: String,
        enum: ['COD', 'PREPAID'],
        default: 'COD',
        required: true,
    },
    user_wallet_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserVollet',
        default: null,
        required: false,
    },
    loyality_coins: {
        type: Number
    },
    prescription_url: {
        type: String,
    },
},
    {
        timestamps: true
    })


module.exports = mongoose.model("Order", orderSchema)