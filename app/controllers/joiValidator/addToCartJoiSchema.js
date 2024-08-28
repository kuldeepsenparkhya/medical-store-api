
const Joi = require('joi');


const productSchema = Joi.object({
    product_ID: Joi.string().required(),
    // product_variant_ID: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
    price: Joi.number().required()
});
// Defining Joi schema for validation
const addToCartVailidationSchema = Joi.object({
    products: Joi.array().items(productSchema).required(),
    user_id: Joi.string().required(),

});

// Exporting Mongoose model and Joi validation schema
module.exports = {
    addToCartVailidationSchema
};