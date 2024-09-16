const { handleError, handleResponse, getPagination, getProducts } = require("../utils/helper");
const { Product, Media, ProductVariant, Brochure, Order, Inventory, Discount, Brand, ProductCategory } = require("../modals");

const fs = require('fs')
const path = require("path");
const { isValidObjectId } = require("mongoose");
const csv = require('csv-parser'); // Make sure to install and require the 'csv-parser' package



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
            })
            // Insert all variants in one go
            await ProductVariant.insertMany(variantData);
        }

        // Process product files
        const files = [];
        if (req?.files?.productFiles && Array.isArray(req?.files?.productFiles)) {
            req?.files?.productFiles.forEach((val) => {
                files.push({
                    url: `${process.env.BASE_URL}/media/${val.filename}`,
                    mimetype: val.mimetype,
                    product_id: newProduct._id
                });
            });

            // Save file metadata
            await Media.insertMany(files); // Use insertMany to handle multiple documents
        }

        // Process brochures files
        const brochures = [];
        if (req?.files?.brochure && Array.isArray(req?.files?.brochure)) {

            req?.files?.brochure.forEach((val) => {
                brochures.push({
                    url: `${process.env.BASE_URL}/broucher/${val.filename}`,
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
        if (!isValidObjectId(id)) {
            return handleError('Invalid Product ID format', 400, res);
        }
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

        if (!isValidObjectId(id)) {
            return handleError('Invalid Product ID format', 400, res);
        }

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

            const inventory = await Inventory.findOne({ product_id: product._id, product_variant_id: variant.id });
            await Inventory.updateOne({ product_id: inventory.product_id, product_variant_id: inventory.product_variant_id }, { total_variant_quantity: variant.quantity }, { new: true })

            // Update each variant by its ID and product ID
            return ProductVariant.updateOne(
                { _id: variant.id, productId: product._id },
                { $set: updatedData }
            );
        }) : ''

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        // Remove Product variants
        const correctedStr = remove_variant?.replace(/'/g, '"');
        const varientIds = correctedStr && JSON?.parse(correctedStr);
        varientIds?.map(async (v) => await ProductVariant.deleteOne({ _id: v, productId: product._id }))

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
        console.log('Sorted products:', sortedProducts);

        // Fetch product details and related data
        const products = await Promise.all(sortedProducts.map(async (item) => {
            try {
                // Fetch the product with populated fields
                const product = await Product.findOne({ _id: item.product_id })
                    .populate('brand_id')
                    .populate('product_category_id');

                if (!product) {
                    console.error(`Product not found for ID: ${item.product_id}`);
                    return null;
                }

                console.log(`Product found for ID: ${item.product_id}`, product);

                // Fetch related media, brochure, and variants
                const media = await Media.find({ product_id: product._id });
                const brochure = await Brochure.find({ product_id: product._id });
                const variants = await ProductVariant.find({ productId: product._id });

                console.log(`Media for product ${product._id}:`, media);
                console.log(`Brochure for product ${product._id}:`, brochure);
                console.log(`Variants for product ${product._id}:`, variants);

                // Ensure product is converted to a plain object
                const productObj = product.toObject ? product.toObject() : product;

                // Add related data to product object
                productObj.media = media;
                productObj.variants = variants;
                productObj.brochure = brochure;

                return productObj;
            } catch (error) {
                console.error(`Error fetching data for product ID: ${item.product_id}`, error);
                return null;
            }
        }));

        // Filter out null products (in case any were not found or had errors)
        const filteredProducts = products.filter(p => p !== null);

        // Debug output
        console.log('Filtered products:', filteredProducts);

        // Send the result
        res.send({ result: filteredProducts });

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


exports.getAllDeletedProducts = async (req, res) => {
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

            { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$productCategory', preserveNullAndEmptyArrays: true } },
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



exports.createBulkProducts = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        const csvFilePath = req.file.path;
        const products = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => products.push(data))
            .on('end', async () => {
                try {
                    // Map to accumulate data
                    const productMap = new Map();

                    // Accumulate product and variant data
                    products.forEach(item => {
                        if (!productMap.has(item.title)) {
                            productMap.set(item.title, {
                                productData: {
                                    title: item.title,
                                    description: item.description,
                                    quantity: item.quantity,
                                    consume_type: item.consume_type,
                                    return_policy: item.return_policy,
                                    expiry_date: item.expiry_date,
                                    manufacturing_date: item.manufacturing_date,
                                    sideEffects: item.sideEffects,
                                    brand_name: item.brand_name,
                                    product_category: item.product_category,
                                },
                                variants: [],
                                media: item.product_image ? [{ url: item.product_image, mimetype: 'image/jpeg' }] : [],
                                brochures: item.product_brochure ? [{ url: item.product_brochure, mimetype: 'application/pdf' }] : [],
                            });
                        }

                        const productEntry = productMap.get(item.title);

                        if (item.v1_size && item.v1_color) {
                            productEntry.variants.push({
                                size: item.v1_size,
                                color: item.v1_color,
                                price: item.v1_price,
                                quantity: item.v1_quantity
                            });
                        }
                        if (item.v2_size && item.v2_color) {
                            productEntry.variants.push({
                                size: item.v2_size,
                                color: item.v2_color,
                                price: item.v2_price,
                                quantity: item.v2_quantity
                            });
                        }
                        if (item.v3_size && item.v3_color) {
                            productEntry.variants.push({
                                size: item.v3_size,
                                color: item.v3_color,
                                price: item.v3_price,
                                quantity: item.v3_quantity
                            });
                        }
                    });

                    // Process all products and variants
                    const operations = Array.from(productMap.entries()).map(async ([title, { productData, variants, media, brochures }]) => {
                        // Find brand and category
                        const brand = await Brand.findOne({ name: { $regex: new RegExp('^' + productData.brand_name + '$', 'i') } });
                        if (!brand) throw new Error(`${productData.brand_name} brand does not exist`);

                        const productCategory = await ProductCategory.findOne({ name: { $regex: new RegExp('^' + productData.product_category + '$', 'i') } });
                        if (!productCategory) throw new Error(`${productData.product_category} product Category does not exist`);

                        // Create product
                        const product = new Product({
                            ...productData,
                            brand_id: brand._id,
                            product_category_id: productCategory._id,
                        });
                        await product.save();

                        // Create variants
                        const variantPromises = variants.map(async (variant) => {
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
                    res.status(200).send('File processed and data inserted successfully.');

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
        res.status(500).send('Error occurred while processing the CSV file');
    }
};