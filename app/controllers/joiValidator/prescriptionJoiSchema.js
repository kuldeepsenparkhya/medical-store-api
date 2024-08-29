const Joi = require("joi")

const createPrescriptions = Joi.object().keys({
    user_id: Joi.string().required(),
})





module.exports = {
    createPrescriptions,
}