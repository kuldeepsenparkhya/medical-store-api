const res = require("express/lib/response");
const { handleError, handleResponse, getPagination } = require("../utils/helper");
const { Product, Media, ProductVariant } = require("../modals");
const { productSchema, updateProductSchema } = require("./joiValidator/productJoi.Schema");

// exports.create = async (req, res) => {
//     try {
//         const { title, description, sku, quantity, consume_type, return_policy, product_category_id, brand_id, expiry_date, manufacturing_date, inStock, sideEffects } = req.body;

//         const { error } = productSchema.validate(req.body, { abortEarly: false });

//         if (error) {
//             handleError(error, 400, res);
//             return;
//         }

//         const data = { title, description, sku, quantity, consume_type, return_policy, product_category_id, brand_id, expiry_date, manufacturing_date, inStock, sideEffects };

//         const newProduct = new Product(data);
//         await newProduct.save();

//         // Process files
//         const files = [];
//         if (req.files && Array.isArray(req.files)) {
//             req.files.forEach((val) => {
//                 files.push({
//                     url: `/media/${val.filename}`,
//                     mimetype: val.mimetype,
//                     product_id: newProduct._id
//                 });
//             });

//             // Save file metadata
//             await Media.insertMany(files); // Use insertMany to handle multiple documents
//         }

//         // Send response
//         handleResponse(res, newProduct._doc, 'Product has been created successfully.', 201);

//     } catch (error) {
//         // Handle any unexpected errors
//         handleError(error.message || 'An unexpected error occurred', 400, res);
//     }
// }



exports.create = async (req, res) => {
    try {
        // Destructure incoming request body
        const {
            title,
            description,
            sku,
            quantity,
            consume_type,
            return_policy,
            product_category_id,
            brand_id,
            expiry_date,
            manufacturing_date,
            inStock,
            sideEffects,
            variants // Add variants to destructured object
        } = req?.body;

        // Validate the request body
        //   const { error } = productSchema.validate(req.body, { abortEarly: false });
        //   if (error) {
        //     handleError(error, 400, res);
        //     return;
        //   }

        // Create the product
        
        const productData = {
            title,
            description,
            sku,
            quantity,
            consume_type,
            return_policy,
            product_category_id,
            brand_id,
            expiry_date,
            manufacturing_date,
            inStock,
            sideEffects
        };

        const newProduct = new Product(productData);
        await newProduct.save();

        const newVarient = JSON?.parse(variants)
        // Process variants if provided
        if (newVarient && Array.isArray(newVarient)) {
            const variantData = newVarient.map(variant => ({
                ...variant,
                productId: newProduct._id // Associate the variant with the new product
            }));

            // Insert all variants in one go


            await ProductVariant.insertMany(variantData);
        }

        // Process files
        const files = [];
        if (req?.files && Array.isArray(req.files)) {
            req?.files.forEach((val) => {
                files.push({
                    url: `/media/${val.filename}`,
                    mimetype: val.mimetype,
                    product_id: newProduct._id
                });
            });

            // Save file metadata
            await Media.insertMany(files); // Use insertMany to handle multiple documents
        }

        // Send response
        handleResponse(res, newProduct._doc, 'Product has been created successfully.', 201);

    } catch (error) {
        // Handle any unexpected errors
        handleError(error.message || 'An unexpected error occurred', 400, res);
    }
};

































exports.find = async (req, res) => {
    try {
        const { q, page = 1, limit = 10, sort = 1, minPrice, maxPrice, categoryName } = req.query;
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const sortOrder = parseInt(sort, 10) === 1 ? 1 : -1;

        // Construct search filter
        const searchFilter = q ? [
            {
                $lookup: {
                    from: 'brands',
                    localField: 'brand_id',
                    foreignField: '_id',
                    as: 'brand'
                }
            },
            {
                $unwind: { path: '$brand', preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: 'productcategories',
                    localField: 'product_category_id',
                    foreignField: '_id',
                    as: 'productCategory'
                }
            },
            {
                $unwind: { path: '$productCategory', preserveNullAndEmptyArrays: true }
            },
            {
                $match: {
                    $or: [
                        { 'brand.name': { $regex: new RegExp(q, 'i') } },
                        { name: { $regex: new RegExp(q, 'i') } },
                        { description: { $regex: new RegExp(q, 'i') } },
                        { 'productCategory.name': { $regex: new RegExp(q, 'i') } }
                    ]
                }
            }
        ] : [];

        // Add filters
        if (minPrice || maxPrice || categoryName) {
            searchFilter.push({
                $match: {
                    ...(minPrice && { price: { $gte: parseFloat(minPrice) } }),
                    ...(maxPrice && { price: { $lte: parseFloat(maxPrice) } }),
                    ...(categoryName && { 'productCategory.name': { $regex: new RegExp(categoryName, 'i') } })
                }
            });
        }

        const pipeline = [
            ...searchFilter,
            { $skip: skip },
            { $limit: parseInt(limit, 10) },
            {
                $lookup: {
                    from: 'variants',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'variant'
                }
            },

            {
                $lookup: {
                    from: 'media',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'mediaFiles'
                }
            },
            {
                $lookup: {
                    from: 'brands',
                    localField: 'brand_id',
                    foreignField: '_id',
                    as: 'brand'
                }
            },
            {
                $lookup: {
                    from: 'productcategories',
                    localField: 'product_category_id',
                    foreignField: '_id',
                    as: 'productCategory'
                }
            },
            { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$productCategory', preserveNullAndEmptyArrays: true } },
            { $sort: { createdAt: sortOrder } }
        ];

        const products = await Product.aggregate(pipeline);
        const totalCount = await Product.countDocuments();

        const getPaginationResult = await getPagination(req.query, products, totalCount);

        handleResponse(res, getPaginationResult, 200);

    } catch (error) {
        handleError(error.message, 400, res);
    }
};


exports.findOne = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findOne({ _id: id }).populate('brand_id').populate('product_category_id')
        const media = await Media.find({ product_id: product._id })
        product._doc.media = media;

        handleResponse(res, product._doc, 'Retrieved Product', 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.update = async (req, res) => {
    try {
        const { title, description, sku, price, discounted_price, quantity, consume_type, return_policy, product_category_id, brand_id, expiry_date, manufacturing_date, inStock, sideEffects } = req.body;

        const { id } = req.params;

        const { error } = updateProductSchema.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }


        const data = { title, description, sku, price, discounted_price, quantity, consume_type, return_policy, product_category_id, brand_id, expiry_date, manufacturing_date, inStock, sideEffects };

        await Product.updateOne({ _id: id }, data, { new: true })
        res.status(200).send({ message: "Product has been successfully update.", error: false })
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.removeProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findOne({ _id: id }).populate('brand_id').populate('product_category_id')


        if (!product) {
            handleError('Invailid product ID.', 400, res)
            return
        }

        await Product.updateOne({ _id: product._id }, { isDeleted: true }, { new: true })
        res.status(200).send({ message: "Product has been successfully removed.", error: false })
    } catch (error) {
        handleError(error.message, 400, res)
    };
};