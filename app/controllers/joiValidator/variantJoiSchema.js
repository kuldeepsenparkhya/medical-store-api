const Joi = require('joi');

// Define Joi schema for product variant
const variantSchema = Joi.object({
    productId: Joi.string().required(),
    attributes: Joi.object({
        color: Joi.string().required(),
        size: Joi.string().required(),
        // Add other attributes as needed
    }).required(),
    price: Joi.number().min(0).required(),
    quantity: Joi.number().min(0).required()
});

module.exports = {
    variantSchema
};
