const { LoyaltyRange } = require("../modals");
const { handleResponse, handleError } = require("../utils/helper");

exports.addCoins = async (req, res) => {
    try {
        const { range, } = req.body
        const loyalityData = new LoyaltyRange({ range: range });

        await loyalityData.save();

        handleResponse(res, loyalityData._doc, 'Loyality range has been successfully created.', 201)

    } catch (error) {
        handleError(error, 400, res);
    }
}


exports.getloyalties = async (req, res) => {
    try {
        const loyaties = await LoyaltyRange.find({});
        handleResponse(res, loyaties, 'Loyality range has been successfully retrieve.', 201)

    } catch (error) {
        handleError(error, 400, res);
    }
}


