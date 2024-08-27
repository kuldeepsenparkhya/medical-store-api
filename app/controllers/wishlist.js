const { WishLists } = require("../model");
const { wishListVailidationSchema } = require("./validator/wishListJoiSchema");

exports.create = async (req, res) => {
    try {
        const { product_ID, quantity } = req.body;
        const { error } = wishListVailidationSchema.validate(req.body, { abortEarly: false });

        if (error) {
            handleError(error, 400, res)
            return;
        }

        const data = { product_ID, quantity, user_ID: req.user._id }

        const wishList = new WishLists(data)
        await wishList.save()

        handleResponse(res, wishList, 'Wishlist created successfully.', 201)
    } catch (error) {
        handleError(error, 400, res)
    }
};


exports.findAllWishLists = async (req, res) => {
    try {

        const { role, q } = req.query;
        const searchFilter = q ? {
            $or: [
                { product_ID: { $regex: new RegExp(q, 'i') } },
            ]
        } : {};

        const wishList = await WishLists.find({ ...searchFilter, user_ID: req.user_id })

        const totalCount = await WishLists.countDocuments()

        const getPaginationResult = await getPagination(req.query, wishList, totalCount);

        handleResponse(res, getPaginationResult, 200)
    } catch (error) {
        handleError(error, 400, res)
    }
}