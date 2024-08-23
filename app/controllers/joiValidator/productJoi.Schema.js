const Joi = require('joi');

// Media schema validation
const mediaSchema = Joi.object({
    fieldname: Joi.string().optional(),
    mimetype: Joi.string().optional(),
    description: Joi.string().optional(),
});

// Product schema validation
const productSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    sku: Joi.string().optional(),
    price: Joi.number().required(), // Assuming price is a string in your schema
    discounted_price: Joi.string().required(), // Assuming discounted_price is a string in your schema
    quantity: Joi.number().required(), // Assuming quantity is a string in your schema
    consume_type: Joi.string()
        .valid('oral', 'topical', 'inhaled', 'sublingual', 'rectal', 'injection', 'nasal')
        .required(),
    return_policy: Joi.string().required(),
    product_category_id: Joi.string().hex().length(24).required(), // Validating ObjectId as a string with 24 hex characters
    brand_id: Joi.string().hex().length(24).required(), // Validating ObjectId as a string with 24 hex characters
    media: Joi.array().items(mediaSchema).optional(),
    expiry_date: Joi.date().required(),
    manufacturing_date: Joi.date().required(),
    inStock: Joi.boolean().default(true),
    sideEffects: Joi.array().items(Joi.string()).optional().default([]),
    attributes: Joi.object().pattern(Joi.string(), Joi.string()).optional()
});




module.exports = {
    productSchema,
}