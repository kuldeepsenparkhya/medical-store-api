const Joi = require('joi');

// Defining Joi schema for validation
const orderVailidationSchema = Joi.object({
    address_id: Joi.string().required(),
    products: Joi.array().items(Joi.object({
        product_id: Joi.string().required(),
        media_id: Joi.string().required(),
        product_variant_id: Joi.string().required(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().min(1).required()
    })).required(),
});

// Exporting Mongoose model and Joi validation schema
module.exports = {
    orderVailidationSchema
};