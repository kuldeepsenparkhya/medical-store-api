const Razorpay = require('razorpay');

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { orderVailidationSchema } = require("./joiValidator/orderJoiSchema");
const { handleError, handleResponse, generateInvoice, sendMailer } = require("../utils/helper");
const { Order, Product, ProductVariant, User, AddressBook, Inventory, Transaction } = require('../modals');
const { isValidObjectId } = require('mongoose');


exports.create = async (req, res) => {
    try {
        const { products, address_id, shipping_charge, order_type } = req.body
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

        const newData = products.map((item, i) => {
            item.total = item.quantity * item.price
            return item;
        })

        let subTotal = 0;
        newData.forEach(item => {
            subTotal += item.total;
        });

        const grandTotal = subTotal + shipping_charge


        const data = { products: newData, subTotal, user_id: user._id, address_id, shippingCost: shipping_charge, total: grandTotal }

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
                await ProductVariant.updateOne(
                    { productId: item.product_id, _id: item.product_variant_id },
                    { inStock: false },
                    { new: true }
                );
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
        
        const message = `
                        <div style="margin:auto; width:70%">
                            <div style="font-family: Helvetica, Arial, sans-serif; min-width:1000px; overflow:auto; line-height:2">
                            <div style="margin:50px auto; width:60%; padding:20px 0">
                                <p style="font-size:25px">Hello ${req.user.name},</p>
                                <p>Thank you for your purchase! We’re excited to let you know that your order <strong>#${newOrder._id}</strong> has been received and is now being processed.</p>
                                <p>Here are the details of your order:</p>
    
                                <table style="width:100%; border-collapse:collapse;">
                                <thead>
                                    <tr>
                                    <th style="border:1px solid #ddd; padding:8px; text-align:left;">Item</th>
                                    <th style="border:1px solid #ddd; padding:8px; text-align:left;">Quantity</th>
                                    <th style="border:1px solid #ddd; padding:8px; text-align:left;">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${orderItems.map(item => `
                                    <tr>
                                        <td style="border:1px solid #ddd; padding:8px;">${item.itemName}</td>
                                        <td style="border:1px solid #ddd; padding:8px;">${item.quantity}</td>
                                        <td style="border:1px solid #ddd; padding:8px;">$${item.price}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                                </table>
    
                                <p style="margin-top:20px;">Subtotal: <strong>$${subTotal}</strong></p>
                                <p>Shipping: <strong>$${shipping_charge}</strong></p>
                                <p>Total: <strong>$${grandTotal}</strong></p>
    
                                <p>We will notify you once your order is on its way. You can check the status of your order at any time by logging into your account.</p>
    
                                <p style="font-size:0.9em;">Thank you for shopping with us!</p>
                                <p style="font-size:0.9em;">Best Regards,<br />Your Company Name</p>
    
                                <hr style="border:none; border-top:1px solid #eee" />
                                <p style="font-size:0.8em; color:#999;">If you have any questions, feel free to reply to this email or contact our support team at support@example.com.</p>
                            </div>
                            </div>
                        </div>
                        `;

        sendMailer(req.user.email, subject, message, res);

        if (order_type === 'prepaid') {

            var razorPayIinstance = new Razorpay({
                key_id: 'rzp_test_GcZZFDPP0jHtC4',
                key_secret: '6JdtQv2u7oUw7EWziYeyoewJ',
            });

            const options = {
                amount: grandTotal * 100,
                currency: 'INR',
                receipt: `${req.user.name}`,
                payment_capture: 1
            }

            const response = await razorPayIinstance.orders.create(options)

            const transactionData = {
                transaction_id: response.id,
                receipt: response.receipt,
                paid_amount: response.paid_amount,
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