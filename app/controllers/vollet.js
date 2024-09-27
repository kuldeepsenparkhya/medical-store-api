const { UserWallet } = require("../modals")
const { handleResponse, handleError } = require("../utils/helper")

exports.getVollet = async (req, res) => {
    try {
        const walletData = await UserWallet.findOne({ user_id: req.user._id })
        handleResponse(res, walletData._doc, 'Retrieve wallet', 200)
    } catch (error) {
        handleError(error, 400, res)
    }
};