const mongoose = require('mongoose');
const { Schema } = mongoose

const loyaltyRangeSchema = Schema({
    range: {
        type: String,
        require: true,
        unique: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },

}, {
    timestamps: true
})


// Create model
module.exports = mongoose.model('LoyaltyRange', loyaltyRangeSchema);
