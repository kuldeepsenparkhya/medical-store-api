const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { orderVailidationSchema } = require("./joiValidator/orderJoiSchema");
const { handleError, handleResponse, generateInvoice, getPagination } = require("../utils/helper");
const { Order } = require('../modals');


exports.create = async (req, res) => {
    try {
        const { products } = req.body
        const { error } = orderVailidationSchema.validate(req.body, { abortEarly: false });

        if (error) {
            handleError(error, 400, res);
            return
        };

        const newData = products.map((item, i) => {
            item.total = item.quantity * item.price
            return item;
        })

        let totalPrice = 0;
        newData.forEach(item => {
            totalPrice += item.total;
        });

        const data = { products: newData, totalPrice, user_id: req.user._id }
        const newOrder = new Order(data);

        await newOrder.save();



        generateInvoice(data.user_id)


        handleResponse(res, newOrder._doc, 'Order has been successfully placed', 201);

    } catch (error) {
        handleError(error, 400, res);
    }
};


exports.findAllOrders = async (req, res) => {
    try {
        // Extract skip and limit from the request query
        const skip = parseInt(req.query.skip, 10) || 0;  // default to 0 if not provided
        const limit = parseInt(req.query.limit, 10) || 10;  // default to 10 if not provided

        // Aggregation pipeline
        const pipeline = [
            { $skip: skip },
            { $limit: limit },
            // Unwind the products array to deal with individual product entries
            { $unwind: { path: "$products", preserveNullAndEmptyArrays: true } },
            // Lookup to fetch the product details
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product_id',  // 'product_id' inside the products array in orders
                    foreignField: '_id',
                    as: 'products.productDetails'
                }
            },
            // Lookup to fetch the variant details
            {
                $lookup: {
                    from: 'variants',
                    localField: 'products.product_variant_id',  // 'product_variant_id' inside the products array in orders
                    foreignField: '_id',
                    as: 'products.variantDetails'
                }
            },
            // Optionally unwind the lookup results if you prefer single objects rather than arrays
            { $unwind: { path: "$products.productDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$products.variantDetails", preserveNullAndEmptyArrays: true } },
            // Lookup for user details
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',  // Assuming 'user_id' in 'orders' matches '_id' in 'users'
                    foreignField: '_id',
                    as: 'users'
                }
            },
            // Unwind the user details if you want them as an object instead of an array
            { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } }
        ];

        // Execute the aggregation
        const orders = await Order.aggregate(pipeline);
        const totalCount = await Order.countDocuments();  // Get total count of orders for pagination

        // Pagination result helper function
        const getPaginationResult = await getPagination(req.query, orders, totalCount);

        // Send response
        handleResponse(res, getPaginationResult, 'All orders have been retrieved successfully.', 200);

    } catch (error) {
        // Error handling
        handleError(error, 400, res);
    }
};



exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findOne({ _id: id })
        handleResponse(res, order._doc, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};





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