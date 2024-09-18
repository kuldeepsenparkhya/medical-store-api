const { isValidObjectId } = require("mongoose");
const { handleError, handleResponse, getPagination } = require("../utils/helper");
const { HealthCategory } = require("../modals");
const { createHealthCategory, updateHealthCategory } = require("./joiValidator/healthCategoryJoi.Schema");


exports.create = async (req, res) => {
    try {
        const { name } = req.body

        const { error } = createHealthCategory.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        let health_category_img = req?.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : ''

        const data = { name, icon: health_category_img }
        const newHealthCategory = new HealthCategory(data);

        await newHealthCategory.save();

        handleResponse(res, newHealthCategory._doc, "Health category added.", 201)

    } catch (error) {
        if (error.code === 11000) {
            handleError('This Health Category already exists.', 400, res)
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

        const healthCategory = await HealthCategory.find({ ...searchFilter })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))

        const totalCount = await HealthCategory.countDocuments()

        const getPaginationResult = await getPagination(req.query, healthCategory, totalCount);

        handleResponse(res, getPaginationResult, 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.findOne = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid category ID format', 400, res);
        }

        const healthCategory = await HealthCategory.findOne({ _id: id })

        if (!healthCategory) {
            handleError('Invailid health category ID.', 400, res)
            return
        }


        const category = await HealthCategory.findOne({ _id: healthCategory._id })
        handleResponse(res, category._doc, 'Retrieve health category.', 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.update = async (req, res) => {
    try {
        const { name } = req.body
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid health category ID format', 400, res);
        }


        const { error } = updateHealthCategory.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        const category = await HealthCategory.findOne({ _id: id })

        if (!category) {
            handleError('Invailid health category ID.', 400, res)
            return
        }

        let health_category_img = req?.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : category.icon

        const data = { name, icon: health_category_img }

        await HealthCategory.updateOne({ _id: category._id }, data, { new: true })

        res.status(200).send({ message: "Category has been successfully update.", error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return handleError('Invalid health category ID format', 400, res);
        }

        const category = await HealthCategory.findOne({ _id: id })
        if (!category) {
            handleError('Health Category ID not exist.', 400, res)
            return
        }

        await HealthCategory.updateOne({ _id: category._id }, { isDeleted: true }, { new: true })

        handleResponse(res, { message: 'Health Category successfully removed.' }, 'Health Category successfully removed.', 200)
    }
    catch (error) {
        handleError(error.message, 400, res)
    };
};

