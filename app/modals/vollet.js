const mongoose = require('mongoose');
const { Schema } = mongoose

const volletSchema = Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        require: false,
        default: null,
    },
    coins: {
        type: Number,
        default: 0
    },


}, {
    timestamps: true
})


// Create model
module.exports = mongoose.model('Vollet', volletSchema);
