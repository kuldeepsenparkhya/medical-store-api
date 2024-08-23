const Joi = require("joi")

const createBrand = Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),

})

const updateBrand = Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
})




module.exports = {
    createBrand,
    updateBrand,

}