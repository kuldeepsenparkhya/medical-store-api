const { default: mongoose } = require('mongoose');
const nodemailer = require('nodemailer');

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path'); // Import the path module


const { SMPT_EMAIL_HOST, SMPT_EMAIL_PORT, SMPT_EMAIL_USER, SMPT_EMAIL_PASSWORD, SMPT_EMAIL_FROM } = require('../config/config');
const { Product } = require('../modals');
const moment = require('moment');


exports.handleResponse = (res, data, message, status = 200) => res.status(status).json({ ...data, error: false, message: message });

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
        subject: `${subject} - Janhit  Chemist`,
        html: message
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending error:', error);
        // res.status(error.responseCode || 500).send({ error: true, message: 'Failed to send email' });
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


exports.newGenerateInvoice = (invoiceData, res) => {
    return new Promise((resolve, reject) => {
        const formattedDate = moment(invoiceData.invoiceDate).format('MMM Do YY');
        const doc = new PDFDocument();

        // Set headers for file download
        res.setHeader('Content-disposition', `attachment; filename=invoice_${invoiceData.orderId}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        // Pipe the PDF document directly to the response
        doc.pipe(res);

        // Add content to the PDF
        doc.fontSize(27).text('Invoice', { align: 'center' }).moveDown();

        // Add invoice details
        doc.fontSize(12)
            .text(`Invoice Date: ${formattedDate}`, 50, 100)
            .text(`Invoice Number: ${invoiceData.orderId}`, 50, 120)
            .moveDown();

        // Add customer information
        doc.fontSize(14).text('Customer Information:', 50, 150)
            .fontSize(12)
            .text(`Name: ${invoiceData.customerName}`, 50, 170)
            .text(`Email: ${invoiceData.customerEmail}`, 50, 190)
            .text(`Mobile: ${invoiceData.customerMobile}`, 50, 210)
            .text(`Address: ${invoiceData.address.address}, ${invoiceData.address.city}, ${invoiceData.address.state} - ${invoiceData.address.pincode}`, 50, 230)
            .moveDown();

        // Add table headers for order details
        const startX = 50;
        const startY = 270;
        const columnWidths = {
            itemName: 250, // Increased width for better alignment
            quantity: 100,
            unitPrice: 100,
            total: 100,
        };

        doc.fontSize(14).text('Order Details:', startX, startY - 20);

        // Draw table headers
        doc.fontSize(12)
            .text('Item Name', startX, startY, { width: columnWidths.itemName, underline: true })
            .text('Quantity', startX + columnWidths.itemName, startY, { width: columnWidths.quantity, underline: true, align: 'center' })
            .text('Unit Price', startX + columnWidths.itemName + columnWidths.quantity, startY, { width: columnWidths.unitPrice, underline: true, align: 'right' })
            .text('Total', startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice, startY, { width: columnWidths.total, underline: true, align: 'right' })
            .moveTo(startX, startY + 15)
            .lineTo(startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice + columnWidths.total, startY + 15)
            .stroke();

        // Start Y position for product details
        let y = startY + 20;

        // Loop through order items and add them to the table
        invoiceData?.orderItems?.forEach((item) => {
            const total = item.quantity * item.price;
            const rowHeight = Math.max(25, Math.ceil(doc.heightOfString(item.itemName, { width: columnWidths.itemName }) / 12) * 12); // Dynamic height based on item name length

            // Draw borders for each row
            doc.moveTo(startX, y - 5)
                .lineTo(startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice + columnWidths.total, y - 5)
                .stroke();

            // Draw text within each column
            doc.fontSize(12)
                .text(item.itemName, startX, y, { width: columnWidths.itemName, align: 'left', continued: true }) // Use continued to allow text wrapping
                .text('', { width: columnWidths.itemName, height: rowHeight }) // To create a new line if necessary
                .text(item.quantity.toString(), startX + columnWidths.itemName, y, { width: columnWidths.quantity, align: 'center' })
                .text(`${Number(item.price).toFixed(2)}`, startX + columnWidths.itemName + columnWidths.quantity, y, { width: columnWidths.unitPrice, align: 'right' })
                .text(`${total.toFixed(2)}`, startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice, y, { width: columnWidths.total, align: 'right' });

            y += rowHeight + 5; // Adjust y position based on dynamic row height
        });

        // Draw borders for the last row
        doc.moveTo(startX, y - 5)
            .lineTo(startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice + columnWidths.total, y - 5)
            .stroke();

        // Add subtotal, shipping, and total amounts
        doc.fontSize(12)
            .text(`Subtotal: ${invoiceData.subTotal.toFixed(2)}`, 400, y + 20, { align: 'right' })
            .text(`Shipping Charges: ${Number(invoiceData.shipping_charge).toFixed(2)}`, 400, y + 40, { align: 'right' })
            .fontSize(16)
            .text(`Grand Total: Rs.${Number(invoiceData.grandTotal).toFixed(2)}`, 400, y + 70, { bold: true, align: 'right' });

        // Finalize the PDF
        doc.end();

        // Resolve the promise when PDF is done writing
        doc.on('finish', () => {
            resolve();
        });

        // Handle errors during PDF generation
        doc.on('error', (error) => {
            console.error('Error during PDF generation:', error);
            reject(error);
        });
    });
};




exports.getProducts = async (productIds) => {
    try {
        // Convert string IDs to ObjectId
        const objectIds = productIds.map(id => new mongoose.Types.ObjectId(id));

        const pipeline = [
            { $match: { _id: { $in: objectIds } } },
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
                    from: 'variants',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'productVariant'
                }
            },

            { $unwind: { path: '$mediaFiles', preserveNullAndEmptyArrays: true } },
        ];

        const products = await Product.aggregate(pipeline);

        return products;
    } catch (error) {
        console.error('Error occurred while fetching products:', error);
        throw error; // Optional: rethrow error to handle it further up the call stack
    }
};


exports.remindeEmail = async (name) => {
    const message = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Reminder</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f4f4f4;
                    }
                    .container {
                        width: 100%;
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        padding-bottom: 10px;
                        border-bottom: 1px solid #dddddd;
                    }
                    .header img {
                        max-width: 150px;
                    }
                    .content {
                        padding: 20px;
                    }
                    .footer {
                        text-align: center;
                        font-size: 12px;
                        color: #999999;
                        padding: 10px 0;
                        border-top: 1px solid #dddddd;
                    }
                    .button {
                        display: inline-block;
                        font-size: 16px;
                        color: #ffffff;
                        background-color: #007bff;
                        padding: 10px 20px;
                        text-decoration: none;
                        border-radius: 4px;
                    }
                    .button:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="https://example.com/logo.png" alt="Company Logo">
                    </div>
                    <div class="content">
                        <h2>Hello ${name},</h2>
                        <p>We wanted to remind you that your order [Order Number] is still pending. Here are the details:</p>
                        <ul>
                            <li><strong>Order Number:</strong> [Order Number]</li>
                            <li><strong>Order Date:</strong> [Order Date]</li>
                            <li><strong>Item(s):</strong> [Item Details]</li>
                            <li><strong>Total Amount:</strong> [Total Amount]</li>
                        </ul>
                        <p>If you have any questions or need further assistance, please do not hesitate to reach out to us.</p>
                        <a href="[Order Link]" class="button">View Your Order</a>
                    </div>
                    <div class="footer">
                        <p>Thank you for shopping with us!</p>
                        <p>Best regards, <br>Your Company Name</p>
                        <p><a href="mailto:support@example.com">support@example.com</a> | <a href="https://example.com">Visit our website</a></p>
                    </div>
                </div>
            </body>
            </html>
        `
    return message
}


// Email sending function
exports.sendRemindMailer = async (email, subject, message) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMPT_EMAIL_HOST,
        port: process.env.SMPT_EMAIL_PORT,
        auth: {
            user: process.env.SMPT_EMAIL_USER,
            pass: process.env.SMPT_EMAIL_PASSWORD
        },
        secure: true
    });

    const mailOptions = {
        from: process.env.SMPT_EMAIL_FROM,
        to: email,
        subject: `${subject} - Janhit Chemist`,
        html: message
    };

    try {
        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending error:', error);
        return error;
    }
};

exports.orderConfirmationMail = async (name, orderID, orderItems, subTotal, shipping_charge, grandTotal) => {
    const message = `
    <div style="margin:auto; width:70%">
        <div style="font-family: Helvetica, Arial, sans-serif; min-width:1000px; overflow:auto; line-height:2">
        <div style="margin:50px auto; width:60%; padding:20px 0">
            <p style="font-size:25px">Hello ${name},</p>
            <p>Thank you for your purchase! We’re excited to let you know that your order <strong>#${orderID}</strong> has been received and is now being processed.</p>
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
    return message
}


exports.orderNotifiationEmail = async (name, orderID, orderItems, subTotal, shipping_charge, grandTotal, status) => {
    const message = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Order Notification</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background-color: #f4f4f4;
                                margin: 0;
                                padding: 20px;
                            }
                            .container {
                                background-color: #fff;
                                border-radius: 8px;
                                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                                padding: 20px;
                                max-width: 600px;
                                margin: auto;
                            }
                            h1 {
                                color: #333;
                            }
                            p {
                                color: #555;
                                line-height: 1.5;
                            }
                            .order-details {
                                border-top: 2px solid #4CAF50;
                                margin-top: 20px;
                                padding-top: 20px;
                            }
                            .button {
                                background-color: #4CAF50;
                                color: white;
                                padding: 10px 20px;
                                text-decoration: none;
                                border-radius: 5px;
                                display: inline-block;
                            }
                            .footer {
                                margin-top: 20px;
                                font-size: 0.9em;
                                color: #777;
                            }
                        </style>
                    </head>
                    <body>

                    <div class="container">
                        <h1>Order Confirmation</h1>
                        <p>Dear [User's Name],</p>
                        <p>Thank you for your order! Your order has been successfully placed, and we are currently processing it.</p>
                        
                        <div class="order-details">
                            <h2>Order Details</h2>
                            <p><strong>Order Number:</strong> [Order Number]</p>
                            <p><strong>Order Date:</strong> [Order Date]</p>
                            <p><strong>Total Amount:</strong> $[Total Amount]</p>
                            <p><strong>Shipping Address:</strong> [Shipping Address]</p>
                        </div>
                        
                        <p>If you have any questions about your order, please feel free to contact us.</p>
                        
                        <a href="[Link to Order Status]" class="button">View Order Status</a>
                        
                        <div class="footer">
                            <p>Thank you for shopping with us!</p>
                            <p>Best Regards,<br>Your Company Name</p>
                        </div>
                    </div>

                    </body>
                    </html>

    `;
    return message
}