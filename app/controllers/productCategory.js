const { ProductCategory } = require("../modals");
const { handleError, handleResponse, getPagination } = require("../utils/helper");
const { createProductCategory } = require("./joiValidator/productCategoryJoi.Schema");


exports.create = async (req, res) => {
    try {
        const { name, description,} = req.body
        const { error } = createProductCategory.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        const data = { name, description,}
        const newCategory = new ProductCategory(data);

        await newCategory.save();

        handleResponse(res, newCategory, 201)

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
        const { role, q } = req.query;
        const searchFilter = q ? {
            $or: [
                { name: { $regex: new RegExp(q, 'i') } },
                { userName: { $regex: new RegExp(q, 'i') } }
            ]
        } : {};

        const productCategory = await ProductCategory.find({ ...searchFilter })

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
        const user = await User.findOne({ _id: id })
        handleResponse(res, user, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.update = async (req, res) => {
    try {
        const {first_name, last_name, email, mobile} = req.body
        const { id } = req.params;

        const { error } = updateUser.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }


        const data = { first_name, last_name, email, mobile }
        await User.updateOne({ _id: id }, data, { new: true })
        res.status(200).send({ message: "User has been successfully update.", error: false })
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user._id === id || req.user.role === 'admin') {
            const user = await User.findOne({ _id: id })

            if (!user) {
                handleError('Invailid user.', 400, res)
                return
            }

            await User.deleteOne({ _id: user._id })

            handleResponse(res, 'User successfully removed.', 200)
        }
        else {
            handleError('User can delete self account or admin can delete user account.', 400, res)
            return
        }
    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.getTotalUsers = async (req, res) => {
    try {
        const users = await User.find()
        const getuAllUsers = users.filter((user) => user.role !== 'admin');
        getuAllUsers?.length
        res.send(getuAllUsers)
    } catch (error) {
        res.send(error)
    }
};
