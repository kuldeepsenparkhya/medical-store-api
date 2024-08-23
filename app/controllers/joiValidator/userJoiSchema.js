const Joi = require("joi")

const registerUser = Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(32).required(),
    mobile: Joi.string().min(10).max(13),
    role: Joi.string(),
})

const updateUser = Joi.object().keys({
    name: Joi.string(),
    email: Joi.string().email(),
    mobile: Joi.string().min(10).max(13),

})


const loginUser = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(32).required(),

})

const resetUserPassword = Joi.object().keys({
    email: Joi.string().email().required(),
})

const updateUserPassword = Joi.object().keys({
    token: Joi.string().required(),
    new_password: Joi.string().required(),
    confirm_password: Joi.string().required(),
})

module.exports = {
    registerUser,
    updateUser,
    loginUser,
    resetUserPassword,
    updateUserPassword,
}