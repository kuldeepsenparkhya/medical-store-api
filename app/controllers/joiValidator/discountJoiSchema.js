const Joi = require("joi");

const createDiscount = Joi.object({
    name: Joi.string().required(), // Ensures discount is a number and required
    discount_offer_type: Joi.string().valid("combo", "single").required(), // Ensures discount_type is either "perc" or "amount" and required
    products: Joi.array().items(Joi.string().optional().allow(null)),


    products: Joi.array().items(
        Joi.object({
            productId: Joi.string().required(),
            variantId: Joi.string().required(),
        }).required()
    ).optional().allow(null),


    discount: Joi.number().required(), // Ensures discount is a number and required
    discount_type: Joi.string().valid("perc", "amount").required(), // Ensures discount_type is either "perc" or "amount" and required
    status: Joi.string().valid("active", "inactive").required(), // Ensures status is either "active" or "inactive" and required
});

module.exports = {
    createDiscount,
};
