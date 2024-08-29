const { WishList } = require("../modals");
const { handleResponse, handleError } = require("../utils/helper");
const { wishListVailidationSchema } = require("./joiValidator/wishListJoiSchema");

exports.create = async (req, res) => {
    try {
        const { product_ID, quantity } = req.body;
        const { error } = wishListVailidationSchema.validate(req.body, { abortEarly: false });

        if (error) {
            handleError(error, 400, res)
            return;
        }

        const data = { product_ID, quantity, user_ID: req.user._id }

        const wishList = new WishList(data)
        await wishList.save()

        handleResponse(res, wishList, 'Wishlist created successfully.', 201)
    } catch (error) {
        handleError(error, 400, res)
    }
};


exports.findAllWishLists = async (req, res) => {
    try {

        const { role, q, page = 1, limit = 10, sort } = req.query;
        const searchFilter = q ? {
            $or: [
                { product_ID: { $regex: new RegExp(q, 'i') } },
            ]
        } : {};

        const wishList = await WishLists.find({ ...searchFilter, user_ID: req.user_id })
            .skip((page - 1) * limit)  // Skip the records for previous pages
            .limit(parseInt(limit))   // Limit the number of records returned
        // .sort({ name: sort });    // Sort if needed (assuming sorting is done by 'name')


        const totalCount = await WishLists.countDocuments()

        const getPaginationResult = await getPagination(req.query, wishList, totalCount);

        handleResponse(res, getPaginationResult, 200)
    } catch (error) {
        handleError(error, 400, res)
    }
}