const Joi = require('joi');


const addNewAddress = Joi.object({
    bill_to: Joi.string().optional().allow(''),
    address: Joi.string().required(),
    land_mark: Joi.string().optional().allow(null),
    city: Joi.string().required(),
    state: Joi.string().required(),
    pincode: Joi.string().required(),
    mobile: Joi.string().optional().allow(null),
    user_id: Joi.string().required(),
    address_type: Joi.string().required(),
    latitude: Joi.string().optional().allow(null),
    longitude: Joi.string().optional().allow(null),
});


// Exporting Mongoose model and Joi validation schema
module.exports = {
    addNewAddress
};