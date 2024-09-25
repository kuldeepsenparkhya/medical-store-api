const Razorpay = require('razorpay');

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { orderVailidationSchema } = require("./joiValidator/orderJoiSchema");
const { handleError, handleResponse, generateInvoice, sendMailer, orderConfirmationMail } = require("../utils/helper");
const { Order, Product, ProductVariant, User, AddressBook, Inventory, Transaction, Offer, Discount } = require('../modals');
const { isValidObjectId } = require('mongoose');


exports.create = async (req, res) => {
    try {
        const { products, address_id, shipping_charge, order_type, coupon_code } = req.body
        const { error } = orderVailidationSchema.validate(req.body, { abortEarly: false });

        if (error) {
            handleError(error, 400, res);
            return
        };

        const address = await AddressBook.findOne({ _id: address_id })

        if (!address) {
            handleError('Invalid address ID', 400, res);
            return;
        }

        const user = await User.findOne({ _id: req?.user?._id })

        if (!user) {
            handleError('You need to login', 400, res);
            return;
        }


        const couponDiscount = await Offer.findOne({ coupon_code: req.body.coupon_code })


        // Check inventory availability
        const outOfStockVariants = [];
        let dueQuantity

        await Promise.all(products.map(async (item) => {
            const inventory = await Inventory.findOne({ product_id: item.product_id, product_variant_id: item.product_variant_id });

            dueQuantity = inventory.total_variant_quantity - inventory.sale_variant_quantity

            if (dueQuantity < item.quantity) {
                outOfStockVariants.push({
                    product_id: item.product_id,
                    product_variant_id: item.product_variant_id,
                    quantity: item.quantity
                })
            }
        }));

        if (outOfStockVariants.length > 0) {
            return res.status(400).send({
                message: 'Out of stock some product varients.',
                error: true,
                dueQuantity,
                outOfStockVariants
            })
        }


        // Order 
        const newData = await Promise.all(products.map(async (item, i) => {
            const discount = await Discount.findOne({ _id: item.discount_id })
            item.total = discount.discount_type === 'perc' ? (item.quantity * item.price) * (1 - discount.discount / 100) : (item.quantity * item.price) - discount.discount;
            return item;
        }))


        let subTotal = 0;

        newData.forEach(item => {
            subTotal += item.total;
        });

        console.log('subTotal', subTotal);

        const grandTotal = couponDiscount.discount_type === 'perc' ? (subTotal + shipping_charge) * (1 - couponDiscount.discount / 100) : (subTotal + shipping_charge) - couponDiscount.discount;

        const data = { products: newData, subTotal, user_id: user._id, address_id, shippingCost: shipping_charge, total: grandTotal, coupon_code, order_type }

        const newOrder = new Order(data);

        await newOrder.save();

        const orderItems = await Promise.all(products.map(async (item) => {

            const product = await Product.findOne({ _id: item.product_id });
            const variant = await ProductVariant.findOne({ _id: item.product_variant_id, productId: item.product_id });
            product._doc.variant = variant;

            const getInventory = await Inventory.findOne({ product_id: item.product_id, product_variant_id: item.product_variant_id })

            // Initialize saleQty with a default value of 0 if getInventory or sale_variant_quantity is undefined
            const currentSaleQty = getInventory?.sale_variant_quantity || 0;
            const saleQty = currentSaleQty + item.quantity;

            // Ensure saleQty is a valid number
            if (isNaN(saleQty)) {
                throw new Error('Invalid quantity value');
            }

            await Inventory.updateOne(
                { product_id: item.product_id, product_variant_id: item.product_variant_id },
                { sale_variant_quantity: saleQty },
                { new: true }
            );

            const getUpdateInventorydata = await Inventory.findOne({ product_id: item.product_id, product_variant_id: item.product_variant_id })

            if (variant?.quantity === getUpdateInventorydata?.sale_variant_quantity) {
                await ProductVariant.updateOne({ productId: item.product_id, _id: item.product_variant_id }, { inStock: false }, { new: true });
            }

            return {
                itemName: product.title,
                quantity: item.quantity,
                price: item.price
            }
        }));

        const invoiceData = {
            orderId: newOrder._id,
            customerName: user?.name,
            customerEmail: user?.email,
            customerMobile: user?.mobile,

            address: {
                address: address.address,
                state: address.state,
                city: address.city,
                pincode: address.pincode,
            },
            subTotal,
            shipping_charge,
            grandTotal,
            orderItems,
            invoiceDate: newOrder.createdAt
        }

        generateInvoice(invoiceData)

        const subject = 'Thank You for Your Purchase!';

        const message = orderConfirmationMail(req.user.name, newOrder._id, orderItems, subTotal, shipping_charge, grandTotal, order_type)

        sendMailer(req.user.email, subject, message, res);

        if (order_type === 'PREPAID') {
            var razorPayIinstance = new Razorpay({
                key_id: 'rzp_test_GcZZFDPP0jHtC4',
                key_secret: '6JdtQv2u7oUw7EWziYeyoewJ',
            });

            const amount = Math.round(grandTotal * 100);

            const options = {
                amount: amount,
                currency: 'INR',
                receipt: `${req.user.name}`,
                payment_capture: 1
            }

            const response = await razorPayIinstance.orders.create(options)

            console.log('response>>>>>>>.', response);



            const transactionData = {
                transaction_id: response.id,
                receipt: response.receipt,
                paid_amount: response.amount,
                currency: response.currency,
                status: response.status,
                order_id: newOrder._id,
            }

            const transaction = new Transaction(transactionData);
            await transaction.save();
        }

        handleResponse(res, newOrder._doc, 'Order has been successfully placed', 201);

    } catch (error) {
        console.log('error>>>>>>>', error);
        handleError(error.message, 400, res);
    }
};



exports.findAllOrders = async (req, res) => {
    try {
        // Retrieve pagination and filter parameters from query
        const { page = 1, limit = 10, period = '3months' } = req.query;

        // Convert query parameters to numbers
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);

        // Calculate date range based on period
        const currentDate = new Date();
        let startDate;

        switch (period) {
            case 'monthly':
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                break;
            case '3months':
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3));
                break;
            case '6months':
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 6));
                break;
            default:
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3)); // Default to 3 months
        }

        // Fetch orders with pagination and date range filter
        const orders = await Order.find({ createdAt: { $gte: startDate } })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .lean();

        // Count total orders for pagination
        const totalOrders = await Order.countDocuments({ createdAt: { $gte: startDate } });

        // Process each order
        const processedOrders = await Promise.all(orders.map(async (order) => {
            // Process each product in the order
            const processedProducts = await Promise.all(order.products.map(async (product) => {
                // Fetch product details
                const productDetails = await Product.findOne({ _id: product.product_id }).lean();
                // Fetch product variant details
                const productVariantDetails = await ProductVariant.findOne({ _id: product.product_variant_id, productId: product.product_id }).lean();
                // Assemble the response format
                return {
                    product: {
                        _id: productDetails._id,
                        title: productDetails.title,
                        description: productDetails.description,
                        consume_type: productDetails.consume_type,
                        return_policy: productDetails.return_policy,
                        product_category_id: productDetails.product_category_id,
                        brand_id: productDetails.brand_id,
                        expiry_date: productDetails.expiry_date,
                        manufacturing_date: productDetails.manufacturing_date,
                        sideEffects: productDetails.sideEffects,
                    },
                    product_variant: {
                        _id: productVariantDetails._id,
                        productId: productVariantDetails.productId,
                        discounted_id: productVariantDetails.discounted_id,
                        size: productVariantDetails.size,
                        color: productVariantDetails.color,
                        price: productVariantDetails.price,
                    },
                    media_id: product.media_id,
                    quantity: product.quantity,
                    price: product.price,
                    _id: product._id,
                };
            }));

            return {
                ...order,
                products: processedProducts,
            };
        }));

        // Send the response with pagination info
        res.send({
            orders: processedOrders,
            currentPage: pageNumber,
            limit: pageSize,
            totalItems: totalOrders,
            totalPages: Math.ceil(totalOrders / pageSize),
            error: false
        });

    } catch (error) {
        // Error handling
        handleError(error.message, 400, res);
    }
};



exports.findOrdersByUserId = async (req, res) => {
    try {
        // Retrieve pagination and filter parameters from query
        const { page = 1, limit = 10, period = '3months' } = req.query;
        // Convert query parameters to numbers
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);

        // Calculate date range based on period
        const currentDate = new Date();
        let startDate;

        switch (period) {
            case 'monthly':
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                break;
            case '3months':
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3));
                break;
            case '6months':
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 6));
                break;
            default:
            // startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3)); // Default to 3 months
        }

        // Fetch orders with pagination and date range filter
        const orders = await Order.find({ user_id: req.params.user_id, createdAt: { $gte: startDate } })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .lean();

        // Count total orders for pagination
        const totalOrders = await Order.countDocuments({ user_id: req.params.user_id, createdAt: { $gte: startDate } });

        // Process each order
        const processedOrders = await Promise.all(orders.map(async (order) => {
            // Process each product in the order
            const processedProducts = await Promise.all(order.products.map(async (product) => {
                // Fetch product details
                const productDetails = await Product.findOne({ _id: product.product_id }).lean();
                // Fetch product variant details
                const productVariantDetails = await ProductVariant.findOne({ _id: product.product_variant_id, productId: product.product_id }).lean();
                // Assemble the response format
                return {
                    product: {
                        _id: productDetails._id,
                        title: productDetails.title,
                        description: productDetails.description,
                        consume_type: productDetails.consume_type,
                        return_policy: productDetails.return_policy,
                        product_category_id: productDetails.product_category_id,
                        brand_id: productDetails.brand_id,
                        expiry_date: productDetails.expiry_date,
                        manufacturing_date: productDetails.manufacturing_date,
                        sideEffects: productDetails.sideEffects,
                    },
                    product_variant: {
                        _id: productVariantDetails._id,
                        productId: productVariantDetails.productId,
                        discounted_id: productVariantDetails.discounted_id,
                        size: productVariantDetails.size,
                        color: productVariantDetails.color,
                        price: productVariantDetails.price,
                    },
                    media_id: product.media_id,
                    quantity: product.quantity,
                    price: product.price,
                    _id: product._id,
                };
            }));

            return {
                ...order,
                products: processedProducts,
            };
        }));

        // Send the response with pagination info
        res.send({
            orders: processedOrders,
            currentPage: pageNumber,
            limit: pageSize,
            totalItems: totalOrders,
            totalPages: Math.ceil(totalOrders / pageSize),
            error: false
        });

    } catch (error) {
        // Error handling
        handleError(error.message, 400, res);
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return handleError('Invalid Order ID format', 400, res);
        }

        // Fetch the order by its ID and populate necessary fields
        const order = await Order.findOne({ _id: id }).lean();

        if (!order) {
            return res.status(404).send({ message: 'Order not found' });
        }

        // Process each product in the order
        const processedProducts = await Promise.all(order.products.map(async (product) => {
            // Fetch product details
            const productDetails = await Product.findOne({ _id: product.product_id }).lean();
            // Fetch product variant details
            const productVariantDetails = await ProductVariant.findOne({ _id: product.product_variant_id, productId: product.product_id }).lean();

            return {
                product: {
                    _id: productDetails._id,
                    title: productDetails.title,
                    description: productDetails.description,
                    consume_type: productDetails.consume_type,
                    return_policy: productDetails.return_policy,
                    product_category_id: productDetails.product_category_id,
                    brand_id: productDetails.brand_id,
                    expiry_date: productDetails.expiry_date,
                    manufacturing_date: productDetails.manufacturing_date,
                    sideEffects: productDetails.sideEffects,
                },
                product_variant: {
                    _id: productVariantDetails._id,
                    productId: productVariantDetails.productId,
                    discounted_id: productVariantDetails.discounted_id,
                    size: productVariantDetails.size,
                    color: productVariantDetails.color,
                    price: productVariantDetails.price,
                },
                media_id: product.media_id,
                quantity: product.quantity,
                price: product.price,
                _id: product._id,
            };
        }));

        // Construct the detailed order response
        const detailedOrder = {
            _id: order._id,
            user_id: order.user_id,
            address_id: order.address_id,
            products: processedProducts,
            subTotal: order.subTotal,
            shippingCost: order.shippingCost,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            __v: order.__v,
        };

        // Send the detailed order response
        handleResponse(res, detailedOrder, 'Retrieve Order data successfully.', 200)

    } catch (error) {
        handleError(error.message, 400, res);
    }
};

exports.cancelledOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid Order ID format', 400, res);
        }

        const order = await Order.findOne({ _id: id, user_id: req.user._id })

        await Promise.all(order?.products?.map(async (product) => {
            const inventory = await Inventory.findOne({ product_id: product.product_id, product_variant_id: product.product_variant_id });

            await Inventory.updateOne({ product_id: product.product_id, product_variant_id: product.product_variant_id },
                {
                    sale_variant_quantity
                        : inventory.sale_variant_quantity - product.quantity
                }, { new: true })
        }))



        if (!order) {
            handleError('Invailid order ID.', 400, res)
            return
        }

        await Order.updateOne({ _id: order._id }, { status: 'cancelled' }, { new: true })

        res.status(200).send({ message: "Order has been successfully cancelled.", error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    }
}

exports.handleCancelledOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid Order ID format', 400, res);
        }

        const { status } = req.body
        const order = await Order.findOne({ _id: id })

        if (!order) {
            handleError('Invailid order ID.', 400, res)
            return
        }

        if (status === 'cancelled') {
            await Promise.all(order?.products?.map(async (product) => {
                const inventory = await Inventory.findOne({ product_id: product.product_id, product_variant_id: product.product_variant_id });
                await Inventory.updateOne({ product_id: product.product_id, product_variant_id: product.product_variant_id },
                    {
                        sale_variant_quantity
                            : inventory.sale_variant_quantity - product.quantity
                    }, { new: true })
            }))
        }


        await Order.updateOne({ _id: order._id }, { status: status }, { new: true })

        res.status(200).send({ message: `Order has been successfully ${status}`, error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    }
}

exports.downloadInvoice = async (req, res) => {
    try {
        const { orderID } = req.params;
        const order = await Order.findOne({ _id: orderID, userID: req.user?.id })
        // res.send(orders)



        // const x = downloadInvoice(orders)


        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Create a new PDF document
        const doc = new PDFDocument();

        // File path to save the generated PDF
        const filePath = path.join(__dirname, "../downloadInvoice", 'example.pdf');

        // Pipe the PDF document to a write stream
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add content to the PDF
        doc
            .fontSize(27)
            .text('Invoice', { align: 'center' })
            .moveDown(); // Move down one line

        // Add invoice details
        doc
            .fontSize(12)
            .text(`Invoice Date: ${order.createdAt}`, 50, 120)
            .text(`Invoice Number: ${order._id}`, 50, 140)
            .moveDown(); // Move down one line

        // Add customer information
        doc
            .fontSize(14)
            .text('Customer Information:', 50, 180)
            .fontSize(12)
            .text('Name: John Doe', 50, 200)
            .text('Email: john@example.com', 50, 220)
            .moveDown(); // Move down one line

        // Add order details
        order.products.forEach((item, index) => {
            doc
                .fontSize(14)
                .text(`Order Details #${index + 1}:`, 50, 260 + index * 40)
                .fontSize(12)
                .text(`Product: ${item.quantity}, Price: ${item.price}`, 50, 280 + index * 40)
                .moveDown(); // Move down one line
        });

        // Add total amount
        doc
            .fontSize(16)
            .text(`Total Amount:${order.totalPrice}`, 50, 340);

        // Finalize PDF file
        doc.end();

        // After finishing, respond with the PDF
        writeStream.on('finish', function () {
            res.download(filePath, 'example.pdf', function (err) {
                if (err) {
                    handleError(err, 500, res);
                } else {
                    fs.unlinkSync(filePath); // Delete the file after downloading
                }
            });
        });
    } catch (error) {
        handleError(error, 400, res);
    }
};

exports.findAllUserOrders = async (req, res) => {
    try {
        // Retrieve pagination and filter parameters from query
        const { page = 1, limit = 10, period = '3months' } = req.query;

        // Convert query parameters to numbers
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);

        // Calculate date range based on period
        const currentDate = new Date();
        let startDate;

        switch (period) {
            case 'monthly':
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                break;
            case '3months':
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3));
                break;
            case '6months':
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 6));
                break;
            default:
                startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3)); // Default to 3 months
        }

        // Fetch orders with pagination and date range filter
        const orders = await Order.find({
            user_id: req.user._id,
            // createdAt: { $gte: startDate }
        })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            .lean();

        // Count total orders for pagination
        const totalOrders = await Order.countDocuments({
            user_id: req.user._id,
            // createdAt: { $gte: startDate }
        });

        // Process each order
        const processedOrders = await Promise.all(orders.map(async (order) => {
            // Process each product in the order
            const processedProducts = await Promise.all(order.products.map(async (product) => {
                // Fetch product details
                const productDetails = await Product.findOne({ _id: product.product_id }).lean();
                // Fetch product variant details
                const productVariantDetails = await ProductVariant.findOne({ _id: product.product_variant_id, productId: product.product_id }).lean();

                // Assemble the response format
                return {
                    product: {
                        _id: productDetails._id,
                        title: productDetails.title,
                        description: productDetails.description,
                        consume_type: productDetails.consume_type,
                        return_policy: productDetails.return_policy,
                        product_category_id: productDetails.product_category_id,
                        brand_id: productDetails.brand_id,
                        expiry_date: productDetails.expiry_date,
                        manufacturing_date: productDetails.manufacturing_date,
                        sideEffects: productDetails.sideEffects,
                    },
                    product_variant: {
                        _id: productVariantDetails._id,
                        productId: productVariantDetails.productId,
                        discounted_id: productVariantDetails.discounted_id,
                        size: productVariantDetails.size,
                        color: productVariantDetails.color,
                        price: productVariantDetails.price,
                    },
                    media_id: product.media_id,
                    quantity: product.quantity,
                    price: product.price,
                    _id: product._id,
                };
            }));

            return {
                ...order,
                products: processedProducts,
            };
        }));

        // Send the response with pagination info
        res.send({
            orders: processedOrders,
            currentPage: pageNumber,
            limit: pageSize,
            totalItems: totalOrders,
            totalPages: Math.ceil(totalOrders / pageSize),
        });

    } catch (error) {
        // Error handling
        handleError(error.message, 400, res);
    }
};


exports.checkout = async (req, res) => {
    var razorPayIinstance = new Razorpay({
        key_id: 'rzp_test_GcZZFDPP0jHtC4',
        key_secret: '6JdtQv2u7oUw7EWziYeyoewJ',
    });

    const options = {
        amount: req.body.amount * 100,
        currency: 'INR',
        receipt: 'reciept#1',
        payment_capture: 1
    }
    try {
        const response = await razorPayIinstance.orders.create(options)

        console.log('response>>>>>>>>>', response);


        res.send({
            order_id: response.id,
            currency: response.currency,
            amount: response.amount,

        })

    } catch (error) {
        res.send({ error: true, message: error.message })
    }
}

exports.payment = async (req, res) => {
    const { paymentId } = req.params;
    const razorpay = new Razorpay({
        key_id: "rzp_test_GcZZFDPP0jHtC4",
        key_secret: "6JdtQv2u7oUw7EWziYeyoewJ"
    })

    try {
        const payment = await razorpay.payments.fetch(paymentId)
        if (!payment) {
            return res.status(500).json("Error at razorpay loading")
        }

        res.json({
            status: payment.status,
            method: payment.method,
            amount: payment.amount,
            currency: payment.currency
        })
    } catch (error) {
        res.status(500).json("failed to fetch")
    }
}

exports.getAllPayments = async (req, res) => {
    const razorpay = new Razorpay({
        key_id: "rzp_test_GcZZFDPP0jHtC4",
        key_secret: "6JdtQv2u7oUw7EWziYeyoewJ"
    });

    try {
        // Fetch all payments
        const payments = await razorpay.payments.all();

        // Check if payments are available
        if (!payments || !payments.items || payments.items.length === 0) {
            return res.status(404).json("No payments found");
        }

        // Example of sending the first payment's details (adjust as necessary)
        const payment = payments.items.map((item) =>
        ({
            status: item.status,
            method: item.method,
            amount: item.amount / 100,
            currency: item.currency,
        }));


        res.send({ payment })

        // res.json({
        //     status: payment.status,
        //     method: payment.method,
        //     amount: payment.amount / 100,
        //     currency: payment.currency,
        // });
    } catch (error) {
        console.error("Error fetching payments:", error); // Log the error for debugging
        res.status(500).json({ message: "Failed to fetch payments", error: error.message });
    }
};


exports.salesReport = async (req, res) => {
    try {
        const { startDate: startDateParam, endDate: endDateParam } = req.query;

        // Parse the dates from query parameters
        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);

        // Validate date inputs
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).send({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
        }

        // Check if the start date is before the end date
        if (startDate > endDate) {
            return res.status(400).send({ error: 'Start date must be before end date.' });
        }

        // Fetch orders and transactions within the date range
        const orders = await Order.find({
            status: 'pending',
            order_type: 'COD',
            createdAt: { $gte: startDate, $lte: endDate }
        }, { total: 1, createdAt: 1 });

        const transactions = await Transaction.find({
            status: 'created',
            createdAt: { $gte: startDate, $lte: endDate }
        }, { paid_amount: 1, createdAt: 1 });

        // Prepare data structure for yearly sales
        const yearlySales = {};
        const yearlyPrepaidSales = {};
        const yearlyTotal = {};

        // Populate sales data for the years involved
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        // Initialize arrays for each year from startYear to endYear
        for (let year = startYear; year <= endYear; year++) {
            yearlySales[year] = Array(12).fill(0);  // 12 months
            yearlyPrepaidSales[year] = Array(12).fill(0);  // 12 months
            yearlyTotal[year] = 0;  // Initialize total sales for each year
        }

        // Aggregate COD sales by year and month
        orders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            const year = orderDate.getFullYear();
            const month = orderDate.getMonth();  // Get month index (0-11)

            if (yearlySales[year]) {
                yearlySales[year][month] += order.total;  // Add the total to the correct month
                yearlyTotal[year] += order.total;  // Add to the yearly total
            }
        });

        // Aggregate PREPAID sales by year and month
        transactions.forEach(transaction => {
            const transactionDate = new Date(transaction.createdAt);
            const year = transactionDate.getFullYear();
            const month = transactionDate.getMonth();  // Get month index (0-11)

            if (yearlyPrepaidSales[year]) {
                yearlyPrepaidSales[year][month] += transaction.paid_amount;  // Add the paid amount to the correct month
                yearlyTotal[year] += transaction.paid_amount;  // Add to the yearly total
            }
        });

        // Create a structured response
        const response = Object.keys(yearlySales).map(year => ({
            year,
            monthlySales: yearlySales[year].map((codSales, monthIndex) => ({
                month: new Date(year, monthIndex).toLocaleString('default', { month: 'long' }),
                totalSalesCOD: codSales.toFixed(2),
                totalSalesPREPAID: (yearlyPrepaidSales[year][monthIndex] || 0).toFixed(2),
                grandTotalSales: (codSales + (yearlyPrepaidSales[year][monthIndex] || 0)).toFixed(2)
            })),
            totalSalesForYear: yearlyTotal[year].toFixed(2)  // Add total sales for each year
        }));

        res.status(200).send(response);
    } catch (error) {
        console.log('Error in salesReport:', error);
        return res.status(500).send({ message: 'Internal server error' });
    }
};
