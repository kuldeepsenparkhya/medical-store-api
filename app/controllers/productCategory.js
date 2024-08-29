const { ProductCategory } = require("../modals");
const { handleError, handleResponse, getPagination } = require("../utils/helper");
const { createProductCategory, updateProductCategory } = require("./joiValidator/productCategoryJoi.Schema");


exports.create = async (req, res) => {
    try {
        const { name, description, } = req.body
        const { error } = createProductCategory.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        let category_img = req?.file ? `/media/${req?.file?.filename}` : ''
        const data = { name, description, category_img: category_img }
        const newCategory = new ProductCategory(data);

        await newCategory.save();

        handleResponse(res, newCategory._doc, 201)

    } catch (error) {
        if (error.code === 11000) {
            handleError('This Category already exists.', 400, res)
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

        const productCategory = await ProductCategory.find({ ...searchFilter })
            .skip((page - 1) * limit)  // Skip the records for previous pages
            .limit(parseInt(limit))   // Limit the number of records returned
        // .sort({ name: sort });    // Sort if needed (assuming sorting is done by 'name')


        const totalCount = await ProductCategory.countDocuments()

        const getPaginationResult = await getPagination(req.query, productCategory, totalCount);

        handleResponse(res, getPaginationResult, 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.findOne = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await ProductCategory.findOne({ _id: id })

        if (!category) {
            handleError('Invailid category ID.', 400, res)
            return
        }


        const productCategory = await ProductCategory.findOne({ _id: category._id })
        handleResponse(res, productCategory._doc, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.update = async (req, res) => {
    try {
        const { name, description } = req.body
        const { id } = req.params;

        const { error } = updateProductCategory.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        const category = await ProductCategory.findOne({ _id: id })

        if (!category) {
            handleError('Invailid category ID.', 400, res)
            return
        }

        let category_img = req?.file ? `/media/${req?.file?.filename}` : ''

        const data = { name, description, category_img: category_img }

        await ProductCategory.updateOne({ _id: category._id }, data, { new: true })

        res.status(200).send({ message: "Category has been successfully update.", error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await ProductCategory.findOne({ _id: id })

        if (!category) {
            handleError('Invailid category ID.', 400, res)
            return
        }

        await ProductCategory.deleteOne({ _id: category._id })

        handleResponse(res, { message: 'ProductCategory successfully removed.' }, 'ProductCategory successfully removed.', 200)
    }
    catch (error) {
        handleError(error.message, 400, res)
    };
};

