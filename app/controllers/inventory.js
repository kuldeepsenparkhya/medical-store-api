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
            .skip((page - 1) * limit)
            .limit(parseInt(limit))


        const totalCount = await Inventory.countDocuments()
        const getPaginationResult = await getPagination(req.query, inventories, totalCount);

        handleResponse(res, getPaginationResult, 200)


    } catch (error) {
        console.log('error>>>>>>>>>>', error);

        handleError(error, 400, res)
    }
}