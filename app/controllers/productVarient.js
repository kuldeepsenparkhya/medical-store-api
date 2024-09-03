const { handleError, handleResponse } = require("../utils/helper");

exports.create = async (req, res) => {
    try {
        const { product_id, varients } = req?.body

        const newProductVarient = new Product(productData);
        await newProductVarient.save();

        handleResponse(res, newProductVarient._doc, 'Product has been created successfully.', 201);

    } catch {
        // Handle any unexpected errors
        handleError(error.message || 'An unexpected error occurred', 400, res);
    }
}