const { handleError, handleResponse, getPagination, getProducts } = require("../utils/helper");
const { Product, Media, ProductVariant, Brochure, Order, Inventory, Discount } = require("../modals");
const { updateProductSchema } = require("./joiValidator/productJoi.Schema");

const path = require("path");
const fs = require('fs').promises;



exports.create = async (req, res) => {
    try {
        const { title, description, sku, quantity, consume_type, return_policy, product_category_id, brand_id, expiry_date, manufacturing_date, inStock, sideEffects, variants } = req?.body;
        if (!variants) {
            handleError('Product variants are missing', 400, res);
            return
        }

        const productData = { title, description, sku, quantity, consume_type, return_policy, product_category_id, brand_id, expiry_date, manufacturing_date, inStock, sideEffects };

        const newProduct = new Product(productData);

        const newVarient = typeof variants === 'string' ? JSON?.parse(variants) : variants

        // Process variants if provided
        if (newVarient && Array.isArray(newVarient)) {
            const variantData = newVarient.map(variant => {
                variant.discounted_id = variant.discounted_id ? variant.discounted_id : null
                const data = {
                    ...variant,
                    productId: newProduct._id
                }
                return data
            }

            );

            // Insert all variants in one go
            await ProductVariant.insertMany(variantData);
        }

        // Process files
        const files = [];
        if (req?.files?.productFiles && Array.isArray(req?.files?.productFiles)) {
            req?.files?.productFiles.forEach((val) => {
                files.push({
                    url: `/media/${val.filename}`,
                    mimetype: val.mimetype,
                    product_id: newProduct._id
                });
            });

            // Save file metadata
            await Media.insertMany(files); // Use insertMany to handle multiple documents
        }

        // Process files
        const brochures = [];
        if (req?.files?.brochure && Array.isArray(req?.files?.brochure)) {

            req?.files?.brochure.forEach((val) => {
                brochures.push({
                    url: `/broucher/${val.filename}`,
                    mimetype: val.mimetype,
                    product_id: newProduct._id
                });
            });

            // Save file metadata
            await Brochure.insertMany(brochures); // Use insertMany to handle multiple documents
        }

        const varients = await ProductVariant.find({ productId: newProduct._id })

        const inventory = varients?.map(async (item) => {
            const data = {
                product_variant_id: item._id,
                product_id: item.productId,
                total_variant_quantity: item.quantity,
            }

            const newInventory = new Inventory(data);
            await newInventory.save();
        })
        await newProduct.save();

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
                },

            },

            {
                $lookup: {
                    from: 'brochures',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'brochures'
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

        const discount = products.map((item) => {
            item.variant.map(async (varient) => {
                const discount = await Discount.findOne({ discounted_id: varient.discounted_id })
                console.log('products>>>>>>>>>>>', discount);
            })
        })


        // Fetch discount details for each variant
        const productsWithDiscounts = await Promise.all(products.map(async (product) => {
            const variantsWithDiscounts = await Promise.all(product.variant.map(async (variant) => {
                const discount = variant.discounted_id ? await Discount.findOne({ _id: variant.discounted_id }) : null;
                return { ...variant, discount };
            }));
            return { ...product, variant: variantsWithDiscounts };
        }));


        const totalCount = await Product.countDocuments();

        const getPaginationResult = await getPagination(req.query, productsWithDiscounts, totalCount);

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
        const brochure = await Brochure.find({ product_id: product._id })

        const variants = await ProductVariant.find({ productId: product._id });
        product._doc.media = media;
        product._doc.variants = variants;
        product._doc.brochure = brochure;


        handleResponse(res, product._doc, 'Retrieved Product', 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const BASE_PATH = path.join(__dirname, "../upload");

        const product = await Product.findOne({ _id: id })
        if (!product) {
            handleError('Invalid product ID', 400, res);
            return
        }

        const { title, description, sku, quantity, consume_type, return_policy, product_category_id,
            brand_id, expiry_date, manufacturing_date, inStock, sideEffects, variants, remove_variant, remove_media, remove_brochure } = req?.body;

        let parsedVariants = [];

        parsedVariants = typeof variants === 'string' ? JSON?.parse(variants) : variants

        const productData = { title, description, sku, quantity, consume_type, return_policy, product_category_id, brand_id, expiry_date, manufacturing_date, inStock, sideEffects };

        // Prepare the update operations
        const updatePromises = parsedVariants ? parsedVariants?.map(async (variant) => {
            const updatedData = {
                size: variant.size,
                price: variant.price,
                discounted_id: variant.discounted_id,
                quantity: variant.quantity
            };
            // Update each variant by its ID and product ID
            return ProductVariant.updateOne(
                { _id: variant.id, productId: product._id },
                { $set: updatedData }
            );
        }) : ''

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        const correctedStr = remove_variant?.replace(/'/g, '"');
        const varientIds = correctedStr && JSON?.parse(correctedStr);

        const correctedMediaStr = remove_media?.replace(/'/g, '"');
        const mediaIds = correctedMediaStr && JSON?.parse(correctedMediaStr);

        varientIds?.map(async (v) => await ProductVariant.deleteOne({ _id: v, productId: product._id }))

        mediaIds?.map(async (m) => {
            const media = await Media.findOne({ _id: m, product_id: product._id })
            const fileName = path.basename(media?.url);

            const filePath = path.join(BASE_PATH, fileName);
            try {
                await fs.access(filePath);
                await fs.unlink(path.join(BASE_PATH, fileName));
            } catch (error) {
                console.log('filePathdffffffffffffffffff>>>>>>>>>>>>>', error.message);
            }

            await Media.deleteOne({ _id: m, product_id: product._id })
        })


        const files = [];
        if (req?.files?.productFiles && Array.isArray(req?.files?.productFiles)) {
            req?.files?.productFiles.forEach((val) => {
                files.push({
                    url: `/media/${val.filename}`,
                    mimetype: val.mimetype,
                    product_id: product._id
                });
            });

            // Save file metadata
            await Media.insertMany(files); // Use insertMany to handle multiple documents
        }

        // Process files
        const brochures = [];
        if (req?.files?.brochure && Array.isArray(req?.files?.brochure)) {
            req?.files?.brochure.forEach((val) => {
                brochures.push({
                    url: `/broucher/${val.filename}`,
                    mimetype: val.mimetype,
                    product_id: product._id
                });
            });


            const brochure = await Brochure.findOne({ _id: remove_brochure, product_id: product._id })

            const fileName = path.basename(brochure?.url);
            const filePath = path.join(BASE_PATH, fileName);
            try {
                await fs.access(filePath);
                await fs.unlink(path.join(BASE_PATH, fileName));

                await Brochure.deleteOne({ _id: remove_brochure, product_id: product._id })

            } catch (error) {
                console.log('filePathdffffffffffffffffff>>>>>>>>>>>>>', error.message);
            }

            // Save file metadata
            await Brochure.insertMany(brochures); // Use insertMany to handle multiple documents
        }

        await Product.updateOne({ _id: id }, productData, { new: true });

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


exports.getTopSellingProducts = async (req, res) => {
    try {
        const orders = await Order.find({})

        const aggregateProductQuantities = (orders) => {
            return orders.reduce((acc, order) => {
                order.products.forEach(({ product_id, quantity }) => {
                    acc[product_id] = (acc[product_id] || 0) + quantity;
                });
                return acc;
            }, {});
        };

        // Helper function to sort products by quantity
        const sortProductsByQuantity = (productQuantities) => {
            return Object.entries(productQuantities)
                .map(([product_id, quantity]) => ({ product_id, quantity }))
                .sort((a, b) => b.quantity - a.quantity);
        };


        const productQuantities = aggregateProductQuantities(orders);
        const sortedProducts = sortProductsByQuantity(productQuantities);




        console.log('productQuantities>>>>>>>>>>>>>', sortedProducts);









        // Fetch product details for the sorted products
        // const productIds = sortedProducts.map(product => product.product_id);
        // const products = await Product.find({ _id: { $in: productIds } })

        // const productMap = new Map(products.map(p => [p._id.toString(), p]));

        // const getProductIds = await sortedProducts.map(product => product.product_id)

        // console.log('result>>>>>>>>>>', productIds);

        // const x = await getProducts(getProductIds)

        // const result = sortedProducts.map(product => {
        //     const productDetails = productMap.get(product.product_id.toString());
        //     return {
        //         ...product,
        //         details: productDetails || null
        //     };
        // });


        // res.send({ result: x });

    } catch (error) {
        handleError(error.message, 400, res);
    }
};


exports.getAllTrashProducts = async (req, res) => {
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
                },

            },

            {
                $lookup: {
                    from: 'brochures',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'brochures'
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

        const discount = products.map((item) => {
            item.variant.map(async (varient) => {
                const discount = await Discount.findOne({ discounted_id: varient.discounted_id })
                console.log('products>>>>>>>>>>>', discount);
            })
        })


        // Fetch discount details for each variant
        const productsWithDiscounts = await Promise.all(products.map(async (product) => {
            const variantsWithDiscounts = await Promise.all(product.variant.map(async (variant) => {
                const discount = variant.discounted_id ? await Discount.findOne({ _id: variant.discounted_id }) : null;
                return { ...variant, discount };
            }));
            return { ...product, variant: variantsWithDiscounts };
        }));

        const getTrashProducts = productsWithDiscounts.filter((value) => value.isDeleted === false)

        const totalCount = await Product.countDocuments();

        const getPaginationResult = await getPagination(req.query, getTrashProducts, totalCount);

        handleResponse(res, getPaginationResult, 200);

    } catch (error) {
        handleError(error.message, 400, res);
    }
};
