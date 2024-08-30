const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { orderVailidationSchema } = require("./joiValidator/orderJoiSchema");
const { handleError, handleResponse, generateInvoice, getPagination } = require("../utils/helper");
const { Order, Media } = require('../modals');


exports.create = async (req, res) => {
    try {
        const { products, address_id } = req.body
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

        const data = { products: newData, totalPrice, user_id: req.user._id, address_id }
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
        const orders = await Order.find({})
            .populate({
                path: 'products.product_id',
                // select: 'title description consume_type return_policy expiry_date manufacturing_date ',
                model: 'Product'
            })
            .populate({
                path: 'products.product_variant_id',
                model: 'Variant'
            })
            .populate({
                path: 'user_id',
                select: 'name email mobile',
                model: 'User'
            })



        // const mediaIDs = []
        // for (let i = 0; i < orders.length; i++) {
        //     const order = orders[i];
        //     if (order.products && order.products.length > 0) {
        //         for (let j = 0; j < order.products.length; j++) {
        //             const product = order.products[j];
        //             console.log('Product>>>>:', product.product_id?._id);
        //             const media = await Media.find({ product_id: product.product_id?._id })
        //             mediaIDs.push(media)
        //         }
        //     }
        // }


        // console.log('mediaIDs<>>>>>>>>>>>>>>>>>', mediaIDs);

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


exports.findAllUserOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        // Calculate the skip value based on current page and limit
        const skip = (page - 1) * limit;

        // Fetch the paginated orders with populated fields
        const orders = await Order.find({ user_id: req.user._id })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'products.product_id',
                select: 'title description consume_type return_policy expiry_date manufacturing_date',
                model: 'Product'
            })
            .populate({
                path: 'products.product_variant_id',
                model: 'Variant'
            })
            .populate({
                path: 'products.media_id',
                select: 'url',
                model: 'Media'
            })
            .populate({
                path: 'user_id',
                select: 'name email mobile',
                model: 'User'
            });

        // Get the total count of orders for pagination
        const totalCount = await Order.countDocuments({ user_id: req.user._id });

        // Pagination result helper function
        const paginationResult = await getPagination(req.query, orders, totalCount);

        // Send response
        handleResponse(res, paginationResult, 'User orders have been retrieved successfully.', 200);

    } catch (error) {
        // Error handling
        handleError(error.message, 400, res);
    }
};



exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findOne({ _id: id }).populate({
            path: 'products.product_id',
            select: 'title description',
            model: 'Product'
        }).populate({
            path: 'products.product_variant_id',
            model: 'Variant'
        }).populate({
            path: 'user_id',
            select: 'name email mobile',
            model: 'User'
        }).exec();

        handleResponse(res, order._doc, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.cancelledOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findOne({ _id: id, user_id: req.user._id })

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
        const { status } = req.body
        const order = await Order.findOne({ _id: id })

        if (!order) {
            handleError('Invailid order ID.', 400, res)
            return
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