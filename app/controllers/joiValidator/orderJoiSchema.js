const Joi = require('joi');

// Defining Joi schema for validation
const orderVailidationSchema = Joi.object({
    address_id: Joi.string().required(),
    shipping_charge: Joi.number().min(0).required(),
    order_type: Joi.string().required(),
    coupon_code: Joi.string().allow(null).optional(),
    user_wallet_id: Joi.string().allow('', null).optional(),


    products: Joi.array().items(Joi.object({
        product_id: Joi.string().required(),
        media_id: Joi.string().allow(null).optional(),
        product_variant_id: Joi.string().required(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().min(1).required(),
        discount_id: Joi.string().allow(null).optional(),
    })).required(),
});

// Exporting Mongoose model and Joi validation schema
module.exports = {
    orderVailidationSchema
};