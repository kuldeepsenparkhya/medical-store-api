const Joi = require("joi")

const createProductCategory = Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),

})

const updateProductCategory = Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
})




module.exports = {
    createProductCategory,
    updateProductCategory,

}