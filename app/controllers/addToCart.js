const { AddToCart } = require("../modals");
const { handleError, handleResponse, getPagination } = require("../utils/helper");
const { addToCartVailidationSchema } = require("./joiValidator/addToCartJoiSchema");

exports.create = async (req, res) => {
    try {
        const { products, user_id } = req.body
        const { error } = addToCartVailidationSchema.validate(req.body, { abortEarly: false });

        if (error) {
            handleError(error, 400, res);
            return;
        };

        const data = { products, user_id: user_id }

        const addToCart = new AddToCart(data);
        await addToCart.save();

        handleResponse(res, data, 'Your product has been successfully added into the cart.', 201);

    } catch (error) {
        handleError(error.message, 400, res);
    }
};

exports.findAll = async (req, res) => {
    try {
        const { role, q } = req.query;
        const searchFilter = q ? {
            $or: [
                { email: { $regex: new RegExp(q, 'i') } }
            ]
        } : {};

        const addToCarts = await AddToCart.find({ ...searchFilter }).populate('products.product_ID')

        const totalCount = await AddToCart.countDocuments()

        const getPaginationResult = await getPagination(req.query, addToCarts, totalCount);

        handleResponse(res, getPaginationResult, 'Your products has been successfully retrieve.', 200)

    } catch (error) {
        handleError(error, 400, res)
    };
}

exports.updateCart = async (req, res) => {
    try {

        const { id } = req.params;

        const cart = await AddToCart.findOne({ _id: id, user: req?.user?._id });

        if (!cart) {

            handleError('Invalid cart ID', 400, res);
            return;
        }

        const { products } = req.body

        const data = { products }

        await AddToCart.updateOne({ _id: cart._id }, data, { new: true })

        handleResponse(res, data, 'Your cart has been successfully updated.', 201);

    } catch (error) {
        handleError(error.message, 400, res);
    }
};

exports.delete = async (req, res) => {
    try {

        const { id } = req.params;

        const cart = await AddToCart.findOne({ _id: id, user: req?.user?._id });

        if (!cart) {

            handleError('Invalid cart ID', 400, res);
            return;
        }

        await AddToCart.deleteOne({ _id: user._id })

        handleResponse(res, 'Removed item  successfully from the cart.', 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};