const Joi = require("joi");
const { default: mongoose } = require("mongoose");




const createProductCategory = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    parent_category_id: Joi.string().allow(null).allow(''), // Allow valid ObjectId or null
});

const updateProductCategory = Joi.object({
    name: Joi.string().allow(''),
    description: Joi.string().allow(''),
    parent_category_id: Joi.string().allow(null).allow(''), // Allow valid ObjectId or null
});

module.exports = {
    createProductCategory,
    updateProductCategory,
};
