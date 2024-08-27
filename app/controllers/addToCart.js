const { AddToCart } = require("../model");
const { handleError, handleResponse, getPagination } = require("../utils/helper");
const { addToCartVailidationSchema } = require("./validator/addToCartJoiSchema");

exports.create = async (req, res) => {
    try {

        const { products } = req.body

        const { error } = addToCartVailidationSchema.validate(req.body, { abortEarly: false });

        if (error) {
            handleError(error, 400, res);
            return
        };

        const data = { products, userId: req.user._id }


        const addToCart = new AddToCart(data);

        await addToCart.save();

        handleResponse(res, data, 'Your product has been successfully added into the cart.', 201);


    } catch (error) {
        handleError(error, 400, res);
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