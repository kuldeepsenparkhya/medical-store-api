const { handleError, handleResponse, getPagination, getProducts, generateProductsCSV } = require("../utils/helper");
const { Product, Media, ProductVariant, Brochure, Order, Inventory, Discount, Brand, ProductCategory, ComboProduct } = require("../modals");
const { exportProductsToCSV } = require('../utils/helper');
const { createObjectCsvStringifier } = require('csv-writer');
const fs = require('fs')
const path = require("path");
const { isValidObjectId } = require("mongoose");
const csv = require('csv-parser'); // Make sure to install and require the 'csv-parser' package
const AsyncLock = require("async-lock");
const fastCsv = require('fast-csv');
const { Parser } = require("json2csv");


exports.create = async (req, res) => {
    try {
        const {
            title,
            description,
            sku,
            consume_type,
            return_policy,
            product_category_id,
            health_category_id,
            brand_id,
            expiry_date,
            manufacturing_date,
            inStock,
            sideEffects,
            variants,
            isRequirePrescription,
        } = req?.body;

        if (!variants) {
            handleError('Product variants are missing', 400, res);
            return
        }

        const validProductCategoryId = (product_category_id && product_category_id !== '') ? product_category_id : null;
        const validHealthCategoryId = (health_category_id && health_category_id !== '') ? health_category_id : null;

        const productData = {
            title,
            description,
            sku,
            consume_type,
            return_policy,
            product_category_id: validProductCategoryId,
            health_category_id: validHealthCategoryId,
            brand_id,
            expiry_date,
            manufacturing_date,
            inStock,
            sideEffects,
            isRequirePrescription
        };

        // Create new product instance
        const newProduct = new Product(productData);

        // Process variants
        const newVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;

        let variantData = [];
        if (newVariants && Array.isArray(newVariants)) {
            variantData = newVariants.map(variant => ({
                ...variant,
                discounted_id: variant.discounted_id || null,
                isDeleted: false,
                productId: newProduct._id,
            }));
            // Insert all variants in one go
            await ProductVariant.insertMany(variantData);
        }

        // Process files
        const files = req?.files?.productFiles || [];
        const brochures = req?.files?.brochure || [];

        const mediaFiles = files.map(file => ({
            url: `${process.env.BASE_URL}/media/${file.filename}`,
            mimetype: file.mimetype,
            product_id: newProduct._id,
        }));

        const brochureFiles = brochures.map(file => ({
            url: `${process.env.BASE_URL}/broucher/${file.filename}`,
            mimetype: file.mimetype,
            product_id: newProduct._id,
        }));

        // Save media and brochures
        await Promise.all([
            Media.insertMany(mediaFiles),
            Brochure.insertMany(brochureFiles),
        ]);

        // Find the variants to create inventory records
        const savedVariants = await ProductVariant.find({ productId: newProduct._id });

        // Create inventory records
        const inventoryPromises = savedVariants.map(item => {
            const inventoryData = {
                product_variant_id: item._id,
                product_id: item.productId,
                total_variant_quantity: item.quantity,
                sale_variant_quantity: 0
            };
            const newInventory = new Inventory(inventoryData);
            return newInventory.save();
        });

        // Wait for all inventory saves to complete
        await Promise.all(inventoryPromises);

        // Save the new product
        await newProduct.save();

        // Send response
        handleResponse(res, newProduct._doc, 'Product has been created successfully.', 201);
    } catch (error) {
        // Handle any unexpected errors
        if (error.code === 11000) {
            handleError('This product SKU is already exists.', 400, res)
            return
        };

        handleError(error.message || 'An unexpected error occurred', 400, res);
    }
};


exports.find = async (req, res) => {
    try {
        const { q, page = 1, limit = 10, sort = 1, minPrice, maxPrice, categoryName, healthCategoryName } = req.query;
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
                $lookup: {
                    from: 'healthcategories',
                    localField: 'health_category_id',
                    foreignField: '_id',
                    as: 'healthcategories'
                }
            },
            {
                $unwind: { path: '$healthCategory', preserveNullAndEmptyArrays: true }
            },

            {
                $match: {
                    $or: [
                        { 'brand.name': { $regex: new RegExp(q, 'i') } },
                        { name: { $regex: new RegExp(q, 'i') } },
                        { description: { $regex: new RegExp(q, 'i') } },
                        { 'productCategory.name': { $regex: new RegExp(q, 'i') } },
                        { 'healthCategory.name': { $regex: new RegExp(q, 'i') } }
                    ]
                }
            }
        ] : [];

        // Add filters
        if (minPrice || maxPrice || categoryName || healthCategoryName) {
            searchFilter.push({
                $match: {
                    ...(minPrice && { price: { $gte: parseFloat(minPrice) } }),
                    ...(maxPrice && { price: { $lte: parseFloat(maxPrice) } }),
                    ...(categoryName && { 'productCategory.name': { $regex: new RegExp(categoryName, 'i') } }),
                    ...(healthCategoryName && { 'healthCategory.name': { $regex: new RegExp(healthCategoryName, 'i') } })

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
            {
                $lookup: {
                    from: 'healthcategories',
                    localField: 'health_category_id',
                    foreignField: '_id',
                    as: 'healthtCategory'
                }
            },
            { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$productCategory', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$healthtCategory', preserveNullAndEmptyArrays: true } },

            { $sort: { createdAt: sortOrder } }
        ];

        const products = await Product.aggregate(pipeline);

        const discount = products.map((item) => {
            item.variant.map(async (varient) => {
                const discount = await Discount.findOne({ discounted_id: varient.discounted_id })
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
        if (!isValidObjectId(id)) {
            return handleError('Invalid Product ID format', 400, res);
        }
        const product = await Product.findOne({ _id: id }).populate('brand_id').populate('product_category_id').populate('health_category_id')

        if (!product) {
            return handleError('Invalid Product ID', 400, res);
        }

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

        if (!isValidObjectId(id)) {
            return handleError('Invalid Product ID format', 400, res);
        }

        const product = await Product.findOne({ _id: id })

        if (!product) {
            handleError('Invalid product ID', 400, res);
            return
        }

        const { title, description, consume_type, return_policy, product_category_id, health_category_id,
            brand_id, expiry_date, manufacturing_date, inStock, sideEffects, variants, remove_variant, remove_media, remove_brochure } = req?.body;

        const validProductCategoryId = product_category_id
        const validHealthCategoryId = health_category_id

        let parsedVariants = [];

        parsedVariants = typeof variants === 'string' ? JSON?.parse(variants) : variants

        const productData = { title, description, consume_type, return_policy, product_category_id: validProductCategoryId, health_category_id: validHealthCategoryId, brand_id, expiry_date, manufacturing_date, inStock, sideEffects };

        // Prepare the update operations
        const updatePromises = parsedVariants ? parsedVariants?.map(async (variant) => {
            const updatedData = {
                size: variant.size,
                price: variant.price,
                discounted_id: variant.discounted_id,
                quantity: variant.quantity
            };

            const inventory = await Inventory.findOne({ product_id: product?._id, product_variant_id: variant.id });

            await Inventory.updateOne({ product_id: inventory.product_id, product_variant_id: inventory.product_variant_id }, { total_variant_quantity: variant.quantity }, { new: true })

            // Update each variant by its ID and product ID
            return ProductVariant.updateOne(
                { _id: variant.id, productId: product?._id },
                { $set: updatedData }
            );
        }) : ''

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        // Remove Product variants
        const correctedStr = remove_variant?.replace(/'/g, '"');
        const varientIds = correctedStr && JSON?.parse(correctedStr);
        varientIds?.map(async (v) => await ProductVariant.updateOne({ _id: v, productId: product._id }, { isDeleted: true }, { new: true }))

        // Remove Medias
        const correctedMediaStr = remove_media?.replace(/'/g, '"');
        const mediaIds = correctedMediaStr && JSON?.parse(correctedMediaStr);

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
                    url: `${process.env.BASE_URL}/media/${val.filename}`,
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
                    url: `${process.env.BASE_URL}/broucher/${val.filename}`,
                    mimetype: val.mimetype,
                    product_id: product._id
                });

            });

            // Save file metadata
            await Brochure.insertMany(brochures); // Use insertMany to handle multiple documents
        }

        if (remove_brochure) {
            const brochure = await Brochure.findOne({ _id: remove_brochure, product_id: product._id })
            if (!brochure) {
                handleError('Invalid brochure ID', 400, res)
                return
            }
            const fileName = path.basename(brochure?.url);
            const filePath = path.join(BASE_PATH, fileName);
            try {
                await fs.access(filePath);
                await fs.unlink(path.join(BASE_PATH, fileName));
            } catch (error) {
                console.log('filePathdffffffffffffffffff>>>>>>>>>>>>>', error.message);
            }
            await Brochure.deleteOne({ _id: brochure._id, product_id: product._id })
        }

        await Product.updateOne({ _id: id }, productData, { new: true });

        res.status(200).send({ message: "Product has been successfully update.", error: false })
    } catch (error) {
        console.log('filePathdffffffffffffffffff>>>>>>>>>>>>>', error);
        handleError(error.message, 400, res)
    };
};


exports.removeProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid Product ID format', 400, res);
        }

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
        // Fetch all orders
        const orders = await Order.find({});
        // Helper function to aggregate product quantities
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

        // Aggregate and sort products
        const productQuantities = aggregateProductQuantities(orders);
        const sortedProducts = sortProductsByQuantity(productQuantities);

        // Fetch product details and related data
        const products = await Promise.all(sortedProducts.map(async (item) => {
            try {
                // Fetch the product with populated fields
                const product = await Product.findOne({ _id: item.product_id })
                    .populate('brand_id')
                    .populate('product_category_id')

                if (!product) {
                    console.error(`Product not found for ID: ${item.product_id}`);
                    return null;
                }

                // Fetch related media, brochure, and variants
                const media = await Media.find({ product_id: product._id });
                const brochure = await Brochure.find({ product_id: product._id });
                const variants = await ProductVariant.find({ productId: product._id });

                // Fetch discount data for each variant
                const variantsWithDiscounts = await Promise.all(variants.map(async (variant) => {
                    const discount = variant.discounted_id ? await Discount.findOne({ _id: variant.discounted_id }) : null;
                    return {
                        ...variant.toObject(),
                        discount: discount ? discount.toObject() : null // Include discount data if it exists
                    };
                }));

                // Ensure product is converted to a plain object
                const productObj = product.toObject ? product.toObject() : product;

                // Add related data to product object
                productObj.variants = variantsWithDiscounts; // Add variants with discounts
                productObj.media = media;
                productObj.brochure = brochure;

                return productObj;
            } catch (error) {
                console.error(`Error fetching data for product ID: ${item.product_id}`, error);
                return null;
            }
        }));

        // Filter out null products (in case any were not found or had errors)
        const filteredProducts = products.filter(p => p !== null);

        // Send the result
        res.send({ result: filteredProducts });

    } catch (error) {
        handleError(error.message, 400, res);
    }
};

// /all/products


exports.getAllProducts = async (req, res) => {
    try {
        const { q, page = 1, limit = 10, sort = 1, minPrice, maxPrice, categoryName, healthCategoryName } = req.query;
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
                $lookup: {
                    from: 'healthcategories',
                    localField: 'health_category_id',
                    foreignField: '_id',
                    as: 'healthCategory'
                }
            },
            {
                $unwind: { path: '$healthCategory', preserveNullAndEmptyArrays: true }
            },

            {
                $match: {
                    $or: [
                        { 'brand.name': { $regex: new RegExp(q, 'i') } },
                        { title: { $regex: new RegExp(q, 'i') } },
                        { sku: { $regex: new RegExp(q, 'i') } },
                        { description: { $regex: new RegExp(q, 'i') } },
                        { 'productCategory.name': { $regex: new RegExp(q, 'i') } },
                        { 'healthCategory.name': { $regex: new RegExp(q, 'i') } },

                    ]
                }
            }
        ] : [];

        // Add filters
        if (minPrice || maxPrice || categoryName || healthCategoryName) {
            searchFilter.push({
                $match: {
                    ...(minPrice && { price: { $gte: parseFloat(minPrice) } }),
                    ...(maxPrice && { price: { $lte: parseFloat(maxPrice) } }),
                    ...(categoryName && { 'productCategory.name': { $regex: new RegExp(categoryName, 'i') } }),
                    ...(healthCategoryName && { 'healthCategory.name': { $regex: new RegExp(healthCategoryName, 'i') } })
                }
            });
        }

        // Filter out deleted products
        const filterDeleted = { isDeleted: false };

        const pipeline = [
            ...searchFilter,
            { $match: filterDeleted },
            { $skip: skip },
            { $limit: parseInt(limit, 10) },
            {
                $lookup: {
                    from: 'variants',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'variant',
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
            {
                $lookup: {
                    from: 'healthcategories',
                    localField: 'health_category_id',
                    foreignField: '_id',
                    as: 'healthCategory'
                }
            },
            { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$productCategory', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$healthCategory', preserveNullAndEmptyArrays: true } },

            { $sort: { createdAt: sortOrder } },
        ];

        const products = await Product.aggregate(pipeline);

        // Fetch discounts for each variant
        const productsWithDiscounts = await Promise.all(products.map(async (product) => {
            const variantsWithDiscounts = product.variant && Array.isArray(product.variant)
                ? await Promise.all(product.variant.map(async (variant) => {
                    const discount = variant.discounted_id ? await Discount.findOne({ _id: variant.discounted_id }) : null;
                    return { ...variant, discount };
                }))
                : [];
            return { ...product, variant: variantsWithDiscounts };
        }));

        // Combine results
        const allProductsWithDiscounts = [...productsWithDiscounts,];
        // Total count for pagination
        const totalCount = await Product.countDocuments(filterDeleted);
        const getPaginationResult = await getPagination(req.query, allProductsWithDiscounts, totalCount);

        handleResponse(res, getPaginationResult, 200);

    } catch (error) {
        console.log('VVVVVVVVVVVVVVVVV', error);
        handleError(error.message, 400, res);
    }
};


// Function to group combo products by discount_id and include necessary data
function groupComboProductsByDiscountId(comboProducts) {
    const grouped = {};

    comboProducts.forEach(combo => {
        const discountId = combo.discount_id;

        // Initialize a new object for the discount_id if it doesn't exist
        if (!grouped[discountId]) {
            grouped[discountId] = {
                discount_id: discountId,
                products: [],
            };
        }

        // Push the current combo product's details into the grouped object
        grouped[discountId].products.push({
            _id: combo._id,
            product_id: {
                _id: combo?.productDetails?._id,
                title: combo?.productDetails?.title,
                description: combo?.productDetails?.description,
                sku: combo?.productDetails?.sku,
                quantity: combo?.productDetails?.quantity,
                product_category_id: combo?.productDetails?.product_category_id,
                brand_id: combo?.productDetails?.brand_id,
                mediaFiles: combo?.mediaFiles,
                // Add other necessary fields here
            },
            product_variant_id: {
                _id: combo?.productVariantDetails?._id, // Full details now
                productId: combo?.productVariantDetails?.productId,
                discounted_id: combo?.productVariantDetails?.discounted_id,
                size: combo?.productVariantDetails?.size,
                color: combo?.productVariantDetails?.color,
                price: combo?.productVariantDetails?.price,
                quantity: combo?.productVariantDetails?.quantity,
                // Add any additional fields needed for the variant
            },
            brand: combo?.brand,
            productCategory: combo?.productCategory, // Include product category details
            createdAt: combo?.createdAt,
            updatedAt: combo?.updatedAt,
        });
    });

    return Object.values(grouped);
}


exports.getMinimumDiscountedProducts = async (req, res) => {
    try {
        const { q, page = 1, limit = 10, sort = 1, categoryName, healthCategoryName, mindiscount = 0 } = req.query;
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
                $lookup: {
                    from: 'healthcategories',
                    localField: 'health_category_id',
                    foreignField: '_id',
                    as: 'healthCategory'
                }
            },
            {
                $unwind: { path: '$healthCategory', preserveNullAndEmptyArrays: true }
            },
            {
                $match: {
                    $or: [
                        { 'brand.name': { $regex: new RegExp(q, 'i') } },
                        { name: { $regex: new RegExp(q, 'i') } },
                        { description: { $regex: new RegExp(q, 'i') } },
                        { 'productCategory.name': { $regex: new RegExp(q, 'i') } },
                        { 'healthCategory.name': { $regex: new RegExp(q, 'i') } },
                    ]
                }
            }
        ] : [];

        // Add filters for category and health category
        if (categoryName || healthCategoryName) {
            searchFilter.push({
                $match: {
                    ...(categoryName && { 'productCategory.name': { $regex: new RegExp(categoryName, 'i') } }),
                    ...(healthCategoryName && { 'healthCategory.name': { $regex: new RegExp(healthCategoryName, 'i') } })
                }
            });
        }

        // Filter out deleted products
        const filterDeleted = { isDeleted: false };

        const pipeline = [
            ...searchFilter,
            { $match: filterDeleted },
            { $skip: skip },
            { $limit: parseInt(limit, 10) },
            {
                $lookup: {
                    from: 'variants',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'variant',
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
            { $sort: { createdAt: sortOrder } },
        ];

        const products = await Product.aggregate(pipeline);

        // Fetch discount details for each variant and filter based on discount >= mindiscount
        const productsWithDiscounts = await Promise.all(products.map(async (product) => {
            const variantsWithDiscounts = await Promise.all(product.variant.map(async (variant) => {
                const discount = variant.discounted_id ? await Discount.findOne({ _id: variant.discounted_id }) : null;

                // If mindiscount is 0, include products with no discount
                if (discount) {
                    if (discount.discount >= mindiscount && discount.discount_type === 'perc') {
                        return { ...variant, discount };
                    }
                } else if (mindiscount === 0) {
                    // Include variants with no discount if mindiscount is 0
                    return variant;
                }
                return null; // Exclude variants that don't meet the discount condition
            }));

            // Filter out null variants (those that don't meet discount criteria)
            const filteredVariants = variantsWithDiscounts.filter(v => v !== null);

            return filteredVariants.length > 0 ? { ...product, variant: filteredVariants } : null;
        }));

        // Filter out null products (those with no qualifying variants)
        const filteredProducts = productsWithDiscounts.filter(p => p !== null);

        const totalCount = await Product.countDocuments(filterDeleted);

        const getPaginationResult = await getPagination(req.query, filteredProducts, totalCount);

        handleResponse(res, getPaginationResult, 200);

    } catch (error) {
        handleError(error.message, 400, res);
    }
};


exports.getAllDeletedProducts = async (req, res) => {
    try {
        const { q, page = 1, limit = 10, sort = 1, minPrice, maxPrice, categoryName, healthCategoryName } = req.query;
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
                $lookup: {
                    from: 'healthcategories',
                    localField: 'health_category_id',
                    foreignField: '_id',
                    as: 'healthCategory'
                }
            },
            {
                $unwind: { path: '$healthCategory', preserveNullAndEmptyArrays: true }
            },
            {
                $match: {
                    $or: [
                        { 'brand.name': { $regex: new RegExp(q, 'i') } },
                        { name: { $regex: new RegExp(q, 'i') } },
                        { description: { $regex: new RegExp(q, 'i') } },
                        { 'productCategory.name': { $regex: new RegExp(q, 'i') } },
                        { 'healthCategory.name': { $regex: new RegExp(q, 'i') } }
                    ]
                }
            }
        ] : [];

        // Add filters
        if (minPrice || maxPrice || categoryName || healthCategoryName) {
            searchFilter.push({
                $match: {
                    ...(minPrice && { price: { $gte: parseFloat(minPrice) } }),
                    ...(maxPrice && { price: { $lte: parseFloat(maxPrice) } }),
                    ...(categoryName && { 'productCategory.name': { $regex: new RegExp(categoryName, 'i') } }),
                    ...(healthCategoryName && { 'healthCategory.name': { $regex: new RegExp(healthCategoryName, 'i') } })

                }
            });
        }


        // Filter out deleted products
        const filterDeleted = { isDeleted: true };


        const pipeline = [
            ...searchFilter,
            { $match: filterDeleted },
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
            {
                $lookup: {
                    from: 'healthcategories',
                    localField: 'health_category_id',
                    foreignField: '_id',
                    as: 'healthtCategory'
                }
            },

            { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$productCategory', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$healthCategory', preserveNullAndEmptyArrays: true } },

            { $sort: { createdAt: sortOrder } }
        ];

        const products = await Product.aggregate(pipeline);

        const discount = products.map((item) => {
            item.variant.map(async (varient) => {
                const discount = await Discount.findOne({ discounted_id: varient.discounted_id })
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

        const totalCount = await Product.countDocuments(filterDeleted);

        const getPaginationResult = await getPagination(req.query, productsWithDiscounts, totalCount);

        handleResponse(res, getPaginationResult, 200);

    } catch (error) {
        handleError(error.message, 400, res);
    }
};


/*
exports.createBulkProducts = async (req, res) => {
    const lock = new AsyncLock();

    try {
        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded.', error: true });
        }

        const csvFilePath = req.file.path;
        const products = [];


        function normalizeBrandName(name) {
            return name ? name.trim().replace(/\s+/g, '_').toLowerCase() : 'unknown';
        }

        function normalizeCategoryName(name) {
            return name ? name.trim().replace(/\s+/g, '_').toLowerCase() : 'unknown';
        }

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => products.push(data))
            .on('end', async () => {
                try {
                    // Map to accumulate data
                    const productMap = new Map();
                    // Accumulate product and variant data
                    products.forEach(async item => {

                        const media = item.product_image ? item.product_image.split('|').map(url => ({ url: url.trim(), mimetype: 'image/jpeg' })) : [];

                        productMap.set(item?.title, {
                            productData: {
                                title: item?.title ? item?.title : 'unknown',
                                sku: item?.sku,
                                description: item?.description,
                                consume_type: item?.consume_type,
                                return_policy: item?.return_policy,
                                expiry_date: item?.expiry_date,
                                manufacturing_date: item?.manufacturing_date ? new Date(item?.manufacturing_date) : null, // Ensure valid Date or null
                                sideEffects: item?.sideEffects,
                                brand_name: item?.brand_name,
                                product_category: item?.product_category,
                                isRequirePrescription: item?.isRequirePrescription && item?.isRequirePrescription !== "" ? item?.isRequirePrescription === "true" : false, // Default to false if missing or empty
                            },
                            variants: [],
                            media: media,
                            brochures: item.product_brochure ? [{ url: item?.product_brochure, mimetype: 'application/pdf' }] : [],
                        });

                        const productEntry = productMap.get(item.title);

                        let variantIndex = 1;

                        while (item[`v${variantIndex}_price`]) {
                            const size = item[`v${variantIndex}_size`] || 'N/A'; // Use 'N/A' or `null` if size is missing
                            const color = item[`v${variantIndex}_color`] || 'N/A'; // Use 'N/A' or `null` if color is missing
                            // Construct the discount name key dynamically
                            const discountNameKey = `v${variantIndex}_discount_name`;
                            const discountName = item[discountNameKey]; // Access the discount name for the current variant
                            const discount = discountName ? await Discount.findOne({ name: discountName }) : null;

                            const variant = {
                                size: size,
                                color: color,
                                price: item[`v${variantIndex}_price`],
                                quantity: item[`v${variantIndex}_quantity`],
                                discounted_id: discount ? discount._id : null, // Handle the case where no discount is found
                            };

                            // Add the variant to the product entry
                            productEntry.variants.push(variant);

                            variantIndex++;
                        }
                    });

                    // Process all products and variants
                    const operations = Array.from(productMap.entries()).map(async ([title, { productData, variants, media, brochures }]) => {
                        // Find or create brand

                        const normalizedBrandName = normalizeBrandName(productData.brand_name);
                        const normalizedCategoryName = normalizeCategoryName(productData.product_category);


                        let brand = await Brand.findOne({ name: normalizedBrandName });
                        if (!brand) {
                            brand = new Brand({ name: normalizedCategoryName });
                            await brand.save();
                        }

                        // Lock for brand creation or finding
                        // let brand;
                        // await lock.acquire(normalizedBrandName, async () => {
                        //     brand = await Brand.findOne({ name: normalizedBrandName });

                        //     if (!brand) {
                        //         try {
                        //             brand = new Brand({ name: normalizedBrandName });
                        //             await brand.save();
                        //         } catch (err) {
                        //             if (err.code === 11000) {
                        //                 // Another process inserted it, get it
                        //                 brand = await Brand.findOne({ name: normalizedBrandName });
                        //             } else {
                        //                 throw err;
                        //             }
                        //         }
                        //     }
                        // });

                        // // Find or create product category
                        let productCategory = await ProductCategory.findOne({ name: productData.product_category });

                        if (!productCategory) {
                            productCategory = new ProductCategory({ name: productData.product_category ? productData.product_category : 'unknown' });
                            await productCategory.save();
                        }
                        // Lock for product category creation or finding
                        // let productCategory;
                        // await lock.acquire(normalizedCategoryName, async () => {
                        //     productCategory = await ProductCategory.findOne({
                        //         name: { $regex: new RegExp('^' + productData.product_category + '$', 'i') }
                        //     });

                        //     if (!productCategory) {
                        //         productCategory = new ProductCategory({ name: productData.product_category || 'unknown' });
                        //         await productCategory.save();
                        //     }
                        // });
                        // Create product

                        const product = new Product({
                            ...productData,
                            brand_id: brand._id, // Ensure brand ID is assigned
                            product_category_id: productCategory._id, // Ensure category ID is assigned
                        });

                        await product.save();

                        // Create variants
                        const variantPromises = variants?.map(async (variant) => {
                            const newVariant = new ProductVariant({
                                ...variant,
                                productId: product._id
                            });

                            await newVariant.save();

                            // Create inventory record
                            const inventoryData = {
                                product_variant_id: newVariant._id,
                                product_id: product._id,
                                total_variant_quantity: variant.quantity,
                                sale_variant_quantity: 0,
                            };
                            const inventory = new Inventory(inventoryData);
                            await inventory.save();
                        });

                        await Promise.all(variantPromises);

                        // Handle media
                        if (media.length) {
                            const mediaPromises = media.map(file => new Media({
                                ...file,
                                product_id: product._id
                            }).save());
                            await Promise.all(mediaPromises);
                        }

                        // Handle brochures
                        if (brochures.length) {
                            const brochurePromises = brochures.map(file => new Brochure({
                                ...file,
                                product_id: product._id
                            }).save());
                            await Promise.all(brochurePromises);
                        }
                    });

                    // Wait for all operations to complete
                    await Promise.all(operations);
                    // Respond with success
                    res.status(200).send({ message: 'File processed and data inserted successfully.', error: false });

                } catch (error) {
                    // Handle errors
                    console.error('Error occurred during processing:', error);
                    res.status(400).send({
                        message: error.message,
                        error: true
                    });
                }
            });

    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).send({ message: 'Error occurred while processing the CSV file', error: true });
    }
};
*/





exports.createBulkProducts = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded.', error: true });
        }

        const csvFilePath = req.file.path;
        const products = [];
        const successfulUploads = [];
        const failedUploads = [];

        const normalizeName = name => name ? name.trim().replace(/\s+/g, '_').toLowerCase() : 'unknown';

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => products.push(data))
            .on('end', async () => {
                for (const item of products) {
                    try {
                        const media = item.product_image
                            ? item.product_image.split('|').map(url => ({ url: url.trim(), mimetype: 'image/jpeg' }))
                            : [];

                        const brochures = item.product_brochure
                            ? [{ url: item.product_brochure, mimetype: 'application/pdf' }]
                            : [];

                        const productData = {
                            title: item?.title || 'unknown',
                            sku: item?.sku,
                            description: item?.description,
                            consume_type: item?.consume_type,
                            return_policy: item?.return_policy,
                            expiry_date: item?.expiry_date,
                            manufacturing_date: item?.manufacturing_date ? new Date(item.manufacturing_date) : null,
                            sideEffects: item?.sideEffects,
                            brand_name: item?.brand_name,
                            product_category: item?.product_category,
                            isRequirePrescription: item?.isRequirePrescription?.toLowerCase() === "true" || false,
                        };

                        const normalizedBrand = normalizeName(productData.brand_name);
                        const normalizedCategory = normalizeName(productData.product_category);

                        let brand = await Brand.findOne({ name: normalizedBrand });
                        if (!brand) brand = await new Brand({ name: normalizedBrand }).save();

                        let category = await ProductCategory.findOne({ name: normalizedCategory });
                        if (!category) category = await new ProductCategory({ name: normalizedCategory }).save();

                        const product = new Product({
                            ...productData,
                            brand_id: brand._id,
                            product_category_id: category._id,
                        });

                        await product.save();

                        let variantIndex = 1;
                        while (item[`v${variantIndex}_price`]) {
                            const discountName = item[`v${variantIndex}_discount_name`];
                            const discount = discountName ? await Discount.findOne({ name: discountName }) : null;

                            const variant = await new ProductVariant({
                                size: item[`v${variantIndex}_size`] || 'N/A',
                                color: item[`v${variantIndex}_color`] || 'N/A',
                                price: item[`v${variantIndex}_price`],
                                quantity: item[`v${variantIndex}_quantity`],
                                discounted_id: discount ? discount._id : null,
                                productId: product._id,
                            }).save();

                            await new Inventory({
                                product_variant_id: variant._id,
                                product_id: product._id,
                                total_variant_quantity: item[`v${variantIndex}_quantity`],
                                sale_variant_quantity: 0,
                            }).save();

                            variantIndex++;
                        }

                        if (media.length) {
                            await Promise.all(media.map(file => new Media({ ...file, product_id: product._id }).save()));
                        }

                        if (brochures.length) {
                            await Promise.all(brochures.map(file => new Brochure({ ...file, product_id: product._id }).save()));
                        }

                        // Log and save success
                        // console.log(`Uploaded product: ${product.title}`);
                        successfulUploads.push(item);
                    } catch (err) {
                        // Log and save failure with error message
                        console.error(`Failed to upload product "${item.title}": ${err.message}`);
                        failedUploads.push({ ...item, error: err.message });
                    }
                }

                // Create reports directory if not exists
                const reportsDir = path.join(__dirname, '../reports');
                fs.mkdirSync(reportsDir, { recursive: true });

                // Write successful uploads to CSV
                if (successfulUploads.length) {
                    const successFields = Object.keys(successfulUploads[0]);
                    const successParser = new Parser({ fields: successFields });
                    const successCsv = successParser.parse(successfulUploads);
                    fs.writeFileSync(path.join(reportsDir, 'successful_upload_report.csv'), successCsv);
                }

                // Write failed uploads with error
                if (failedUploads.length) {
                    const failFields = Object.keys(failedUploads[0]);
                    const failParser = new Parser({ fields: failFields });
                    const failCsv = failParser.parse(failedUploads);
                    fs.writeFileSync(path.join(reportsDir, 'unsuccessful_upload_report.csv'), failCsv);
                }

                // return res.status(200).send({
                //     message: 'Upload processing complete.',
                //     successCount: successfulUploads.length,
                //     failedCount: failedUploads.length,
                //     successReport: '/reports/successful_upload_report.csv',
                //     ...(failedUploads.length > 0 && {
                //         errorReport: '/reports/unsuccessful_upload_report.csv',
                //         failedData: failedUploads
                //     }),
                //     error: false
                // });


                return res.status(200).send({
                    message: 'Upload processing complete.',
                    successCount: successfulUploads.length,
                    failedCount: failedUploads.length,
                    successReport: successfulUploads.length ? `${process.env.BASE_URL}/download/report/success` : null,
                    errorReport: failedUploads.length ? `${process.env.BASE_URL}/download/report/error` : null,
                    error: false
                });

            });

    } catch (error) {
        console.error(' Fatal Error:', error);
        return res.status(500).send({ message: 'Internal server error.', error: true });
    }
};

exports.downloadSuccessReport = async (req, res) => {
    const reportPath = path.join(__dirname, '../reports/successful_upload_report.csv');
    if (fs.existsSync(reportPath)) {
        res.download(reportPath, 'successful_upload_report.csv');
    } else {
        res.status(404).send({
            message: 'No successful upload report available.',
            error: true
        });
    }
};

exports.downloadErrorReport = async (req, res) => {
    const reportPath = path.join(__dirname, '../reports/unsuccessful_upload_report.csv');
    if (fs.existsSync(reportPath)) {
        res.download(reportPath, 'unsuccessful_upload_report.csv');
    } else {
        res.status(404).send({
            message: 'No failed upload report available.',
            error: true
        });
    }
};

exports.verifyUploadedCSVProducts = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "No file uploaded", error: true });
        }

        const uploadedFilePath = req.file.path;
        const uploadedProducts = [];

        fs.createReadStream(uploadedFilePath)
            .pipe(csv())
            .on("data", (row) => uploadedProducts.push(row))
            .on("end", async () => {
                const reportData = [];

                for (const row of uploadedProducts) {
                    let status = "Not Found";

                    const brand = await Brand.findOne({ name: row.brand_name?.trim().toLowerCase().replace(/\s+/g, "_") });
                    const category = await ProductCategory.findOne({ name: row.product_category?.trim().toLowerCase().replace(/\s+/g, "_") });

                    if (brand && category) {
                        const product = await Product.findOne({
                            title: row.title,
                            sku: row.sku,
                            brand_id: brand._id,
                            product_category_id: category._id,
                            description: row.description
                        });

                        if (product) {
                            const mediaMatch = row.product_image
                                ? await Media.findOne({ product_id: product._id, url: row.product_image.split("|")[0]?.trim() })
                                : null;

                            const discount = row.v1_discount_name
                                ? await Discount.findOne({ name: row.v1_discount_name })
                                : null;

                            const variantMatch = await ProductVariant.findOne({
                                productId: product._id,
                                price: parseFloat(row.v1_price),
                                quantity: parseInt(row.v1_quantity),
                                discounted_id: discount ? discount._id : null,
                            });

                            if (variantMatch && (row.product_image ? mediaMatch : true)) {
                                status = "Uploaded";
                            } else {
                                status = "Partial Match";
                            }
                        }
                    }

                    reportData.push({
                        ...row,
                        status
                    });
                }

                // Ensure reports directory exists
                const reportsDir = path.join(__dirname, "../reports");
                if (!fs.existsSync(reportsDir)) {
                    fs.mkdirSync(reportsDir, { recursive: true });
                }

                // Generate CSV
                const csvFields = Object.keys(reportData[0] || {});
                const json2csvParser = new Parser({ fields: csvFields });
                const csvData = json2csvParser.parse(reportData);

                const outputPath = path.join(reportsDir, "verify_upload_report.csv");
                fs.writeFileSync(outputPath, csvData);

                res.download(outputPath, "verify_upload_report.csv");
            });
    } catch (err) {
        console.error("Verification error:", err);
        res.status(500).json({ message: "Internal server error", error: true });
    }
};

exports.generateAndDownloadCSV = async (req, res) => {
    try {
        let { start = 0, end = 1000 } = req.query;
        start = parseInt(start);
        end = parseInt(end);

        if (isNaN(start) || isNaN(end) || start < 0 || end <= start) {
            return res.status(400).json({ error: true, message: 'Invalid range parameters' });
        }

        const limit = end - start;

        const products = await Product.aggregate([
            { $match: { isDeleted: false } },
            { $sort: { createdAt: 1 } },
            { $skip: start },
            { $limit: limit },
            {
                $lookup: {
                    from: 'variants',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'variant',
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
            {
                $lookup: {
                    from: 'healthcategories',
                    localField: 'health_category_id',
                    foreignField: '_id',
                    as: 'healthCategory'
                }
            },
            { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$productCategory', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$healthCategory', preserveNullAndEmptyArrays: true } }
        ]);

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'title', title: 'title' },
                { id: 'sku', title: 'sku' },
                { id: 'description', title: 'description' },
                { id: 'consume_type', title: 'consume_type' },
                { id: 'return_policy', title: 'return_policy' },
                { id: 'expiry_date', title: 'expiry_date' },
                { id: 'manufacturing_date', title: 'manufacturing_date' },
                { id: 'sideEffects', title: 'sideEffects' },
                { id: 'brand_name', title: 'brand_name' },
                { id: 'product_category', title: 'product_category' },
                { id: 'product_image', title: 'product_image' },
                { id: 'product_brochure', title: 'product_brochure' },
                { id: 'isRequirePrescription', title: 'isRequirePrescription' },
                { id: 'v1_size', title: 'v1_size' },
                { id: 'v1_color', title: 'v1_color' },
                { id: 'v1_price', title: 'v1_price' },
                { id: 'v1_quantity', title: 'v1_quantity' },
                { id: 'v1_discount_name', title: 'v1_discount_name' },
                { id: 'v2_size', title: 'v2_size' },
                { id: 'v2_color', title: 'v2_color' },
                { id: 'v2_price', title: 'v2_price' },
                { id: 'v2_quantity', title: 'v2_quantity' },
                { id: 'v2_discount_name', title: 'v2_discount_name' },
                { id: 'v3_size', title: 'v3_size' },
                { id: 'v3_color', title: 'v3_color' },
                { id: 'v3_price', title: 'v3_price' },
                { id: 'v3_quantity', title: 'v3_quantity' },
                { id: 'v3_discount_name', title: 'v3_discount_name' }
            ]
        });

        const records = await Promise.all(products.map(async (p) => {
            const variant = p.variant || [];

            const discountNames = await Promise.all(variant.map(async (v) => {
                if (v.discounted_id) {
                    const discount = await Discount.findById(v.discounted_id);
                    return discount ? discount.name : '';
                }
                return '';
            }));

            return {
                title: p.title || '',
                sku: p.sku || '',
                description: p.description || '',
                consume_type: p.consume_type || '',
                return_policy: p.return_policy || '',
                expiry_date: p.expiry_date || '',
                manufacturing_date: p.manufacturing_date || '',
                sideEffects: (p.sideEffects || []).join(', '),
                brand_name: p.brand?.name || '',
                product_category: p.productCategory?.name || '',
                product_image: (p.mediaFiles || []).map(img => img.url).join(' | ') || '',
                product_brochure: p.brochures?.[0]?.url || '',
                isRequirePrescription: p.isRequirePrescription ? 'true' : 'false',

                v1_size: variant[0]?.size || '',
                v1_color: variant[0]?.color || '',
                v1_price: variant[0]?.price || '',
                v1_quantity: variant[0]?.quantity || '',
                v1_discount_name: discountNames[0] || '',

                v2_size: variant[1]?.size || '',
                v2_color: variant[1]?.color || '',
                v2_price: variant[1]?.price || '',
                v2_quantity: variant[1]?.quantity || '',
                v2_discount_name: discountNames[1] || '',

                v3_size: variant[2]?.size || '',
                v3_color: variant[2]?.color || '',
                v3_price: variant[2]?.price || '',
                v3_quantity: variant[2]?.quantity || '',
                v3_discount_name: discountNames[2] || ''
            };
        }));

        // Set headers and stream to browser
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products_export.csv"');

        // Write CSV to response stream
        res.write(csvStringifier.getHeaderString());
        res.write(csvStringifier.stringifyRecords(records));
        res.end();

    } catch (err) {
        console.error('CSV generation and download error:', err);
        res.status(500).json({ error: true, message: 'Failed to generate or download CSV file' });
    }
};
