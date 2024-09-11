const { Vollet } = require("../modals")
const { handleResponse, handleError } = require("../utils/helper")

exports.getVollet = async (req, res) => {
    try {
        const volletAmmou = await Vollet.findOne({ user_id: req.user._id })
        handleResponse(res, volletAmmou._doc, 'Retrieve vollet', 200)
    } catch (error) {
        handleError(error, 400, res)
    }
};