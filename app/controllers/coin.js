const { isValidObjectId } = require("mongoose");
const { handleError, handleResponse } = require("../utils/helper");
const { Coin } = require("../modals");

exports.addCoins = async (req, res) => {
    try {
        const { coins, coins_amount } = req.body
        const data = { coins, coins_amount };
        const coinData = new Coin(data);

        await coinData.save();

        handleResponse(res, coinData._doc, 'Coins and amount successfully added.', 201)

    } catch (error) {
        handleError(error, 400, res);
    }
}

exports.updateCoinConversion = async (req, res) => {
    try {
        const { id } = req.params;
        const { coins, coins_amount } = req.body

        if (!isValidObjectId(id)) {
            return handleError('Invalid Coin ID format', 400, res);
        }

        const getCoin = await Coin.findOne({ _id: id })

        if (!getCoin) {
            return handleError('Invalid Coin ID', 400, res);
        };

        await Coin.updateOne({ _id: getCoin._id }, { coins, coins_amount }, { new: true })

        handleResponse(res, [], 'Update coins and amount successfully.', 200)

    } catch (error) {
        handleError(error, 400, res);
    }
};


exports.getCoin = async (req, res) => {
    try {
        const getCoin = await Coin.findOne({})
        handleResponse(res, getCoin._doc, 'Coin retreive successfully.', 200)
    } catch (error) {
        handleError(error, 400, res);
    }
};