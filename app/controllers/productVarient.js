const { ProductVariant, Inventory, } = require("../modals");
const { handleError, handleResponse } = require("../utils/helper");

exports.create = async (req, res) => {
    try {
        const { product_id, varients } = req.body;

        if (!Array.isArray(varients)) {
            return handleError('Invalid input for variants', 400, res);
        }

        const newVariant = await Promise.all(varients.map(async (item) => {
            const data = {
                productId: product_id,
                size: item.size,
                price: item.price,
                discounted_id: item.discounted_id ? item.discounted_id : null,
                quantity: item.quantity
            };
            return data;
        }));

        const newProductVarient = await ProductVariant.insertMany(newVariant);

        await Promise.all(newProductVarient.map(async (item) => {
            const data = {
                product_variant_id: item._id,
                product_id: item.productId,
                total_variant_quantity: item.quantity,
            }

            const newInventory = new Inventory(data);
            await newInventory.save();
        }));


        res.status(201).send({
            data: newProductVarient,
            message: 'Product has been created successfully.',
            error: false
        })
    } catch (error) {
        handleError(error.message || 'An unexpected error occurred', 400, res);
    }
};
