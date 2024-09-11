const mongoose = require('mongoose');
const { Schema } = mongoose

const coinsSchema = Schema({
    coins: {
        type: Number,
        default: 0
    },
    coins_amount: {
        type: Number,
        default: 0
    },

}, {
    timestamps: true
})


// Create model
module.exports = mongoose.model('Coins', coinsSchema);
