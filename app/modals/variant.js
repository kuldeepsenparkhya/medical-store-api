const mongoose = require('mongoose');
const { Schema } = mongoose

const productVariantSchema = Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    attributes: {
        color: String,
        size: String,
        // other attributes as needed
    },
    price: Number,
    quantity: Number

}, {
    timestamps: true
})


// Create model
module.exports = mongoose.model('Variant', productVariantSchema);
