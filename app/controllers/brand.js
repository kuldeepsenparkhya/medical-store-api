const { isValidObjectId } = require("mongoose");
const { Brand } = require("../modals");
const { handleError, handleResponse, getPagination } = require("../utils/helper");
const { createBrand, updateBrand } = require("./joiValidator/brandJoi.Schema");


exports.create = async (req, res) => {
    try {
        const { name, description, } = req.body
        const { error } = createBrand.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        let file_URL = req?.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : ''

        const data = { name, description, brand_logo: file_URL }
        const newBrand = new Brand(data);

        await newBrand.save();

        handleResponse(res, newBrand._doc, 'Brand successfully added.', 201)

    } catch (error) {
        if (error.code === 11000) {
            handleError('This Brand already exists.', 400, res)
            return
        }
        handleError(error.message, 400, res)
    };
};


exports.find = async (req, res) => {
    try {
        const { role, q, page = 1, limit = 10, sort } = req.query;

        const searchFilter = q ? {
            $or: [
                { name: { $regex: new RegExp(q, 'i') } },
                { userName: { $regex: new RegExp(q, 'i') } }
            ]
        } : {};
        // Apply pagination and sorting to the query
        const brand = await Brand.find({ ...searchFilter })
            .skip((page - 1) * limit)  // Skip the records for previous pages
            .limit(parseInt(limit))   // Limit the number of records returned
        // .sort({ name: sort });    // Sort if needed (assuming sorting is done by 'name')

        // Get the count of documents matching the search filter
        const totalCount = await Brand.countDocuments({ ...searchFilter });

        // Generate the pagination result
        const getPaginationResult = await getPagination(req.query, brand, totalCount);

        // Handle the response
        handleResponse(res, getPaginationResult, 200);

    } catch (error) {
        handleError(error.message, 400, res);
    }
};

exports.findOne = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid Brand ID format', 400, res);
        }

        const brand = await Brand.findOne({ _id: id })

        if (!brand) {
            handleError('Brand is not exist.', 400, res)
            return
        }

        const brandData = await Brand.findOne({ _id: brand._id })

        handleResponse(res, brandData._doc, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.update = async (req, res) => {
    try {
        const { name, description } = req.body
        const { id } = req.params;


        if (!isValidObjectId(id)) {
            return handleError('Invalid Brand ID format', 400, res);
        }

        const { error } = updateBrand.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        const brand = await Brand.findOne({ _id: id })

        if (!brand) {
            handleError('Invailid Brand ID.', 400, res)
            return
        }

        let file_URL = req?.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : brand.brand_logo

        const data = { name, description, brand_logo: file_URL }

        await Brand.updateOne({ _id: brand._id }, data, { new: true })

        res.status(200).send({ message: "Brand has been successfully update.", error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid Brand ID format', 400, res);
        }

        const brand = await Brand.findOne({ _id: id })

        if (!brand) {
            handleError('Brand ID is not exist.', 400, res)
            return
        }

        await Brand.updateOne({ _id: brand._id }, { isDeleted: true }, { new: true })

        handleResponse(res, { message: 'Brand successfully removed.' }, 'Brand successfully removed.', 200)
    }
    catch (error) {
        handleError(error.message, 400, res)
    };
};

