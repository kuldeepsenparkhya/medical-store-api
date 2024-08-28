const mongoose = require('mongoose');
const { Schema } = mongoose

const productVariantSchema = Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    size: {
        type: String,
        required: true,
    },
    color: {
        type: String,
        default: null, // Optional, in case the product has color variants
    },
    price: {
        type: Number,
        required: true,
    },
    discounted_price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },

}, {
    timestamps: true
})


// Create model
module.exports = mongoose.model('Variant', productVariantSchema);
