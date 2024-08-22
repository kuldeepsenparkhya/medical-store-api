const Joi = require("joi")

const registerUser = Joi.object().keys({
    first_name: Joi.string().required(),
    last_name: Joi.string(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(32).required(),
    mobile: Joi.string().min(10).max(13),
    role: Joi.string(),
})

const updateUser = Joi.object().keys({
    first_name: Joi.string(),
    last_name: Joi.string(),
    email: Joi.string().email(),
    mobile: Joi.string().min(10).max(13),

})


const loginUser = Joi.object().keys({
    userName: Joi.string().required(),
    password: Joi.string().min(8).max(32).required(),

})

const resetUserPassword = Joi.object().keys({
    email: Joi.string().email().required(),
})

const updateUserPassword = Joi.object().keys({
    token: Joi.string().required(),
    newPassword: Joi.string().required(),
    confirmPassword: Joi.string().required(),
})

module.exports = {
    registerUser,
    updateUser,
    loginUser,
    resetUserPassword,
    updateUserPassword,
}