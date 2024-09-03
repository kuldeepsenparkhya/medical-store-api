const { default: mongoose } = require('mongoose');
const nodemailer = require('nodemailer');


const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path'); // Import the path module




const { SMPT_EMAIL_HOST, SMPT_EMAIL_PORT, SMPT_EMAIL_USER, SMPT_EMAIL_PASSWORD, SMPT_EMAIL_FROM } = require('../config/config');
const { Product } = require('../modals');


exports.handleResponse = (res, data, message, status = 200) => res.status(status).json({
    ...data,
    error: false,
    message: message

});

exports.handleError = (error, status = 400, res,) => {
    if (error.details) {
        const data = {};
        error?.details.forEach(v => {
            data[v.context?.key] = [v.message.replace(/"/g, '')];
        })

        return res.status(status).send({ message: data, error: true, })
    }

    return res.status(status).send({ message: error, error: true, })
}




// Modify the getPagination function to correctly reflect the data
exports.getPagination = async (query, fetchedData, totalCount) => {
    const { page = 1, limit = 10 } = query;

    // Calculate pagination information
    const paginationInfo = {
        data: fetchedData,  // Paginated data
        totalPages: Math.ceil(totalCount / limit),  // Total number of pages
        currentPage: parseInt(page, 10),  // Current page number
        totalItems: totalCount  // Total number of matching documents
    };

    return paginationInfo;
};




exports.sendMailer = async (email, subject, message, res) => {
    const transporter = nodemailer.createTransport({
        host: SMPT_EMAIL_HOST,
        port: SMPT_EMAIL_PORT,
        auth: {
            user: SMPT_EMAIL_USER,
            pass: SMPT_EMAIL_PASSWORD
        },
        secure: true
    });

    const mailOptions = {
        from: SMPT_EMAIL_FROM,
        to: email,
        subject: `${subject} - Food donation NGO`,
        html: message
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending error:', error);
        res.status(error.responseCode || 500).send({ error: true, message: 'Failed to send email' });
    }
};

exports.createUUID = () => {
    var dt = new Date().getTime()
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0
        dt = Math.floor(dt / 16)
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })

    return uuid
}


exports.sendNotification = (subscription, payload) => {
    webpush.sendNotification(subscription, payload).catch(err => console.error(err));
}


exports.generateInvoice = (invoiceName) => {
    // Create a new PDF document
    const doc = new PDFDocument();

    // File path to save the generated PDF
    const filePath = path.join(__dirname, "../invoices", `${invoiceName}.pdf`);

    // Pipe the PDF document to a write stream
    doc.pipe(fs.createWriteStream(filePath));

    // Add content to the PDF
    doc
        .fontSize(27)
        .text('Invoice', { align: 'center' })
        .moveDown(); // Move down one line

    // Add invoice details
    doc
        .fontSize(12)
        .text('Invoice Date: January 1, 2024', 50, 120)
        .text('Invoice Number: #123456789', 50, 140)
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
    doc
        .fontSize(14)
        .text('Order Details:', 50, 260)
        .fontSize(12)
        .text('Product 1: $50', 50, 280)
        .text('Product 2: $30', 50, 300)
        .moveDown(); // Move down one line

    // Add total amount
    doc
        .fontSize(16)
        .text('Total Amount: $80', 50, 340);

    // Finalize PDF file
    doc.end();
}


exports.downloadInvoice = (orders) => {
    // Create a new PDF document
    const doc = new PDFDocument();

    // File path to save the generated PDF
    const filePath = path.join(__dirname, "../invoices", 'example.pdf');

    // Pipe the PDF document to a write stream
    doc.pipe(fs.createWriteStream(filePath));

    // Add content to the PDF
    doc
        .fontSize(27)
        .text('Invoice', { align: 'center' })
        .moveDown(); // Move down one line

    // Add invoice details
    doc
        .fontSize(12)
        .text(`Invoice Date: ${orders.createdAt}`, 50, 120)
        .text('Invoice Number: #123456789', 50, 140)
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

    orders?.products?.map((item) => {
        doc
            .fontSize(14)
            .text('Order Details:', 50, 260)
            .fontSize(12)
            .text(`Product 1: ${item.price}`, 50, 280)
            .moveDown(); // Move down one line
    })



    // Add total amount
    doc
        .fontSize(16)
        .text('Total Amount: $80', 50, 340);

    // Finalize PDF file
    doc.end();
}


exports.getProducts = async (productIds) => {
    try {
        // Convert string IDs to ObjectId
        const objectIds = productIds.map(id => new mongoose.Types.ObjectId(id));
        console.log('objectIds>>>>>>>', objectIds);

        const pipeline = [
            // Match only the documents with _id in the provided array of ObjectIds
            { $match: { _id: { $in: objectIds } } },
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
            { $unwind: { path: '$productCategory', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$mediaFiles', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } }
        ];

        const products = await Product.aggregate(pipeline);

        return products;
    } catch (error) {
        console.error('Error occurred while fetching products:', error);
        throw error; // Optional: rethrow error to handle it further up the call stack
    }
};