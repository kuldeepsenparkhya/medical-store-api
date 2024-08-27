const Joi = require('joi');

// Defining Joi schema for validation
const orderVailidationSchema = Joi.object({
    
    products: Joi.array().items(Joi.object({
        productId: Joi.string().required(),
        productVariantId: Joi.string().required(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().min(1).required()
    })).required(),
});

// Exporting Mongoose model and Joi validation schema
module.exports = {
    orderVailidationSchema
};