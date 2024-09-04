const { ProductVariant, Inventory } = require("../modals");
const { handleError, handleResponse } = require("../utils/helper");

exports.create = async (req, res) => {
    try {
        const { product_id, varients } = req?.body


        const insertManyVariants = await ProductVariant.insertMany(files);

        const getVarients = await ProductVariant.find({ productId: newProductVarient._id })

        const inventory = getVarients?.map(async (item) => {
            const data = {
                product_variant_id: item._id,
                product_id: item.productId,
                total_variant_quantity: item.quantity,
            }

            const newInventory = new Inventory(data);
            await newInventory.save();
        })





        handleResponse(res, newProductVarient._doc, 'Product has been created successfully.', 201);

    } catch {
        handleError(error.message || 'An unexpected error occurred', 400, res);
    }
}