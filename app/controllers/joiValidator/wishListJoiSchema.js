
const Joi = require('joi');

// Defining Joi schema for validation
const wishListVailidationSchema = Joi.object({
    product_ID: Joi.string().required(),
    quantity: Joi.number().required()
});

// Exporting Mongoose model and Joi validation schema
module.exports = {
    wishListVailidationSchema
};