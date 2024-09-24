const { isValidObjectId } = require("mongoose");
const { AddressBook } = require("../modals");
const { handleResponse, handleError, getPagination } = require("../utils/helper");
const { addNewAddress } = require("./joiValidator/addressJoiSchema");

exports.create = async (req, res) => {
    try {
        const { bill_to, address, land_mark, city, state, pincode, mobile, user_id, address_type, latitude, longitude } = req.body
        const { error } = addNewAddress.validate(req.body, { abortEarly: false })
        if (error) {
            handleError(error, 400, res)
            return
        }

        if (!isValidObjectId(user_id)) {
            return handleError('Invalid user_id ID format', 400, res);
        }

        const data = { bill_to, address, land_mark, city, state, pincode, mobile, user_id, address_type, latitude, longitude };

        const newAddress = new AddressBook(data);
        await newAddress.save();
        const datad = { ...newAddress._doc, }
        handleResponse(res, datad, 'Address has been successfully added.', 201)
    } catch (error) {
        if (error.code === 11000) {
            handleError('This email is already exists.', 400, res)
            return
        }
        handleError(error.message, 400, res)
    };
};

exports.findAddressByUserID = async (req, res) => {
    try {
        const { id } = req.params
        const address = await AddressBook.find({ user_id: id })

        const addressData = address.filter((data) => data.isDeleted === false);

        const totalCount = await AddressBook.countDocuments()
        const getPaginationResult = await getPagination(req.query, addressData, totalCount);

        handleResponse(res, getPaginationResult, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.findOne = async (req, res) => {
    try {
        const { addressId } = req.params
        if (!isValidObjectId(addressId)) {
            return handleError('Invalid addressId ID format', 400, res);
        }

        const address = await AddressBook.findOne({ _id: addressId })
        handleResponse(res, address._doc, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.updateAddress = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid id ID format', 400, res);
        }

        const { bill_to, address, land_mark, city, state, pincode, mobile, user_id, address_type, latitude, longitude } = req.body
        const data = { bill_to, address, land_mark, city, state, pincode, mobile, user_id, address_type, latitude, longitude };

        const getAddress = await AddressBook.findOne({ _id: id });
        if (!getAddress) {
            handleError('Invailid address Id.', 400, res)
            return
        }

        await AddressBook.updateOne({ _id: getAddress._id }, data, { new: true })
        handleResponse(res, '', 'address successfully updated.', 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.trashAddress = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return handleError('Invalid id ID format', 400, res);
        }

        const address = await AddressBook.findOne({ _id: id })

        if (!address) {
            handleError('Invailid address Id.', 400, res)
            return
        }

        await AddressBook.updateOne({ _id: address._id }, { isDeleted: true }, { new: true })

        handleResponse(res, '', 'address successfully removed.', 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};

