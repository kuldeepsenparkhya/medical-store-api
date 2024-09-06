const { handleError, handleResponse, getPagination } = require("../utils/helper");
const { createDiscount } = require("./joiValidator/discountJoiSchema");
const { Discount } = require("../modals");
const { isValidObjectId } = require("mongoose");

exports.create = async (req, res) => {
    try {
        const { discount, discount_type, status } = req.body;
        const { error } = createDiscount.validate(req.body, { abortEarly: false });

        if (error) {
            handleError(error, 400, res);
            return
        };

        const data = { discount, discount_type, status }
        const newDiscount = new Discount(data);

        await newDiscount.save();

        handleResponse(res, newDiscount._doc, 'Discount has been successfully created', 201);

    } catch (error) {

        if (error.code === 11000) {
            handleError('This discount is already exists.', 400, res)
            return
        }

        handleError(error.message, 400, res)
    }
};


exports.find = async (req, res) => {
    try {

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        // Calculate the skip value based on current page and limit
        const skip = (page - 1) * limit;

        const discount = await Discount.find({})
            .skip(skip)
            .limit(limit)
        const totalCount = await Discount.countDocuments();
        // Pagination result helper function
        const paginationResult = await getPagination(req.query, discount, totalCount);

        // Send response
        handleResponse(res, paginationResult, 'All discounts have been retrieved successfully.', 200);

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.findOne = async (req, res) => {
    try {

        const { id } = req.params;

        // Validate the ID
        if (!isValidObjectId(id)) {
            return handleError('Invalid discount ID format', 400, res);
        }

        const discount = await Discount.findOne({ _id: req.params.id })
        if (!discount) {
            handleError('Invalid discount ID', 400, res)
            return
        }

        handleResponse(res, discount._doc, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.handleDiscountStatus = async (req, res) => {
    try {
        const { status } = req.body
        const discount = await Discount.findOne({ _id: req.params.id })

        if (!discount) {
            handleError('Invailid discount ID.', 400, res)
            return
        }

        await Discount.updateOne({ _id: discount._id }, { status }, { new: true })
        res.status(200).send({ message: `Discount has been successfully ${status}.`, error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    }
}


exports.removeDiscount = async (req, res) => {
    try {
        const { isDeleted } = req.body
        const discount = await Discount.findOne({ _id: req.params.id })

        if (!discount) {
            handleError('Invailid discount ID.', 400, res)
            return
        }

        await Discount.updateOne({ _id: discount._id }, { isDeleted }, { new: true })

        res.status(200).send({ message: `Discount has been successfully removed.`, error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    }
}