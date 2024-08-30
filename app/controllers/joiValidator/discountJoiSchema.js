const Joi = require("joi");

const createDiscount = Joi.object({
    discount: Joi.number().required(), // Ensures discount is a number and required
    discount_type: Joi.string().valid("perc", "amount").required(), // Ensures discount_type is either "perc" or "amount" and required
    status: Joi.string().valid("active", "inactive").required(), // Ensures status is either "active" or "inactive" and required
});

module.exports = {
    createDiscount,
};
