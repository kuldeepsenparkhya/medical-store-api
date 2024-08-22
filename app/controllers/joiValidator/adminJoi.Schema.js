const Joi = require("joi")

const loginAdmin = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(32).required(),

})
const resetAdminPassword = Joi.object().keys({
    email: Joi.string().email().required(),
})

const updateAdminPassword = Joi.object().keys({
    tokne: Joi.string().required(),
    newPassword: Joi.string().required(),
    confirmPassword: Joi.string().required(),
})

module.exports = {
    loginAdmin,
    resetAdminPassword,
    updateAdminPassword
}