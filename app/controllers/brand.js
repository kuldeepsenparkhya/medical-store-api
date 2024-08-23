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
        
        let file_URL = req?.file ? `/media/${req?.file?.filename}` : ''

        const data = { name, description, brand_logo: file_URL }
        const newBrand = new Brand(data);

        await newBrand.save();

        handleResponse(res, newBrand._doc, 201)

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
        const { role, q } = req.query;
        const searchFilter = q ? {
            $or: [
                { name: { $regex: new RegExp(q, 'i') } },
                { userName: { $regex: new RegExp(q, 'i') } }
            ]
        } : {};

        const brand = await Brand.find({ ...searchFilter })

        const totalCount = await Brand.countDocuments()

        const getPaginationResult = await getPagination(req.query, brand, totalCount);

        handleResponse(res, getPaginationResult, 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.findOne = async (req, res) => {
    try {
        const { id } = req.params;

        const brand = await Brand.findOne({ _id: id })

        if (!brand) {
            handleError('Invailid Brand ID.', 400, res)
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

        const { error } = updateBrand.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        const brand = await ProductCategory.findOne({ _id: id })

        if (!brand) {
            handleError('Invailid Brand ID.', 400, res)
            return
        }

        const data = { name, description }

        await Brand.updateOne({ _id: brand._id }, data, { new: true })

        res.status(200).send({ message: "Brand has been successfully update.", error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const brand = await Brand.findOne({ _id: id })

        if (!brand) {
            handleError('Invailid Brand ID.', 400, res)
            return
        }

        await Brand.deleteOne({ _id: brand._id })

        handleResponse(res, { message: 'Brand successfully removed.' }, 'Brand successfully removed.', 200)
    }
    catch (error) {
        handleError(error.message, 400, res)
    };
};

