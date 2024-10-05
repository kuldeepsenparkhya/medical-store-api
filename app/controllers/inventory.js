const { Inventory } = require("../modals")
const { handleResponse, getPagination, handleError } = require("../utils/helper")

exports.getInventory = async (req, res) => {
    try {
        const { role, q, page = 1, limit = 10, sort } = req.query;
        const searchFilter = q ? {
            $or: [
                { name: { $regex: new RegExp(q, 'i') } },
                { email: { $regex: new RegExp(q, 'i') } },
                { mobile: { $regex: new RegExp(q, 'i') } },
            ]
        } : {};

        const inventories = await Inventory.find({ ...searchFilter })
            .populate('product_id')
            .populate('product_variant_id')
            .skip((page - 1) * limit)
            .limit(parseInt(limit))


        const totalCount = await Inventory.countDocuments()
        const getPaginationResult = await getPagination(req.query, inventories, totalCount);

        handleResponse(res, getPaginationResult, 200)


    } catch (error) {
        handleError(error, 400, res)
    }
}


exports.getInventoryOutOfStockSoon = async (req, res) => {
    try {
        const { role, q, page = 1, limit = 10, sort } = req.query;

        // Construct the search filter for product names, emails, or mobile numbers
        const searchFilter = q ? {
            $or: [
                { name: { $regex: new RegExp(q, 'i') } },
                { email: { $regex: new RegExp(q, 'i') } },
                { mobile: { $regex: new RegExp(q, 'i') } },
            ]
        } : {};

        // Find inventories with the specified condition
        const inventories = await Inventory.find({
            ...searchFilter,
            $expr: {
                $lte: [
                    { $subtract: ["$total_variant_quantity", "$sale_variant_quantity"] },
                    5
                ]
            }
        })
            .populate('product_id')
            .populate('product_variant_id')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Count documents with the same condition for pagination
        const totalCount = await Inventory.countDocuments({
            ...searchFilter,
            $expr: {
                $lte: [
                    { $subtract: ["$total_variant_quantity", "$sale_variant_quantity"] },
                    5
                ]
            }
        });

        const getPaginationResult = await getPagination(req.query, inventories, totalCount);

        handleResponse(res, getPaginationResult, "Successfully retrieved inventories for products that are soon to be out of stock.", 200);

    } catch (error) {
        handleError(error, 400, res);
    }
}
