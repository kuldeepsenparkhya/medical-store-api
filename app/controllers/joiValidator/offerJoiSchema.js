const Joi = require('joi');

// Defining Joi schema for validation
const createOfferSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    validateTo: Joi.string().required(),
    coupon_code: Joi.string().required(),
    discount: Joi.number().required(),
    discount_type: Joi.string().required(),

});

// Exporting Mongoose model and Joi validation schema
module.exports = {
    createOfferSchema
};