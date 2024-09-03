const mongoose = require("mongoose")
const { Schema } = mongoose

const inventorySchema = Schema({
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
    total_variant_quantity: {
        type: Number,
        min: 0
    },
    sale_variant_quantity: {
        type: Number,
        min: 0
    },
},
    {
        timestamps: true
    })


module.exports = mongoose.model("Inventory", inventorySchema)