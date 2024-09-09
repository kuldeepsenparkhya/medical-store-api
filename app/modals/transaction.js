const mongoose = require("mongoose")
const { Schema } = mongoose

const transactionSchema = Schema({
    transaction_id: {
        type: String,
        require: true
    },
    order_id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },

    paid_amount: {
        type: Number,
        default: 0,
    },
    receipt: {
        type: String,
        required: true,
    },
    currency: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },

},
    {
        timestamps: true
    })



module.exports = mongoose.model("Transaction", transactionSchema)