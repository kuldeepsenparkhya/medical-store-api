const { Order } = require("../model");
const { handleError, handleResponse, getPagination, generateInvoice, downloadInvoice } = require("../utils/helper");
const { orderVailidationSchema } = require("./validator/orderJoiSchema");


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

        const data = { products: newData, totalPrice, userId: req.user._id }
        const newOrder = new Order(data);

        await newOrder.save();
        generateInvoice()
        handleResponse(res, newOrder._doc, 'Order has been successfully placed', 201);

    } catch (error) {
        handleError(error, 400, res);
    }
};

exports.findAllOrders = async (req, res) => {
    try {
        const { role, q } = req.query;
        const searchFilter = q ? {
            $or: [
                { full_name: { $regex: new RegExp(q, 'i') } },
                { email: { $regex: new RegExp(q, 'i') } }
            ]
        } : {};

        const orders = await Order.find({ ...searchFilter })

        const totalCount = await Order.countDocuments()

        const getPaginationResult = await getPagination(req.query, orders, totalCount);

        handleResponse(res, getPaginationResult, 'Your orders has been retrieve successfuly.', 200)

    } catch (error) {
        handleError(error, 400, res);
    }
};



const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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