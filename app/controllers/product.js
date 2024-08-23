const res = require("express/lib/response");
const { handleError, handleResponse, getPagination } = require("../utils/helper");
const { Product } = require("../modals");
const { productSchema } = require("./joiValidator/productJoi.Schema");

exports.create = async (req, res) => {
    try {
        const { title, description, sku, price, discounted_price, quantity, consume_type, return_policy, product_category_id, brand_id, expiry_date, manufacturing_date, inStock, sideEffects, attributes } = req.body;

        // const { error } = productSchema.validate(req.body, { abortEarly: false })

        // if (error) {
        //     handleError(error, 400, res)
        //     return
        // }

        const data1 = []

        req?.files.map((val) => {
            data1.push({
                url: `/media/${val.filename}`,
                mimetype: val.mimetype
            })
        })

        const data = { title, description, sku, price, discounted_price, quantity, consume_type, return_policy, product_category_id, brand_id, expiry_date, manufacturing_date, inStock, sideEffects, media: data1, attributes }

        const newProduct = new Product(data);

        await newProduct.save();

        handleResponse(res, newProduct._doc, 'Product has been created successfully.', 201)

    } catch (error) {
        handleError(error.message, 400, res)
    }
}


exports.find = async (req, res) => {
    try {
        const { role, q } = req.query;
        const searchFilter = q ? {
            $or: [
                { name: { $regex: new RegExp(q, 'i') } },
                { userName: { $regex: new RegExp(q, 'i') } }
            ]
        } : {};

        const products = await Product.find({ ...searchFilter })

        const totalCount = await Product.countDocuments()

        const getPaginationResult = await getPagination(req.query, products, totalCount);

        handleResponse(res, getPaginationResult, 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.findOne = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findOne({ _id: id })
        handleResponse(res, product._doc, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};
