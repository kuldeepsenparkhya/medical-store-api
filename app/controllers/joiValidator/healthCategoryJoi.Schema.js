const Joi = require("joi");



const createHealthCategory = Joi.object({
    name: Joi.string().required(),
});

const updateHealthCategory = Joi.object({
    name: Joi.string().allow('')
});

module.exports = {
    createHealthCategory,
    updateHealthCategory,
};
