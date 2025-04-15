const { default: mongoose } = require('mongoose');
const nodemailer = require('nodemailer');

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path'); // Import the path module
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const { Parser } = require('json2csv');
const { createObjectCsvWriter } = require('csv-writer');
const { SMPT_EMAIL_HOST, SMPT_EMAIL_PORT, SMPT_EMAIL_USER, SMPT_EMAIL_PASSWORD, SMPT_EMAIL_FROM } = require('../config/config');
// const { Product } = require('../modals');
const moment = require('moment');
const { log } = require('console');
const { Product, Media, ProductVariant, Brochure, Order, Inventory, Discount, Brand, ProductCategory, ComboProduct, HealthCategory, Variant } = require("../modals");


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



// exports.sendMailer = async (email, subject, message, res) => {
//     const transporter = nodemailer.createTransport({
//         host: SMPT_EMAIL_HOST,
//         port: SMPT_EMAIL_PORT,
//         auth: {
//             user: SMPT_EMAIL_USER,
//             pass: SMPT_EMAIL_PASSWORD
//         },
//         secure: true
//     });

//     const mailOptions = {
//         from: SMPT_EMAIL_FROM,
//         to: email,
//         subject: `${subject} - Janhit  Chemist`,
//         html: message
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//     } catch (error) {
//         console.error('Email sending error:', error);
//         // res.status(error.responseCode || 500).send({ error: true, message: 'Failed to send email' });
//     }
// };


exports.sendMailer = async (email, subject, message, res) => {
    try {
        // Ensure that message is not a Promise, resolve it if necessary
        if (message instanceof Promise) {
            message = await message;
        }

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
            subject: `${subject} - Janhit Chemist`,
            html: message
        };

        // Send the email
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending error:', error);
        // Handle error response
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


// exports.newGenerateInvoice = (invoiceData, res) => {
//     return new Promise((resolve, reject) => {
//         const formattedDate = moment(invoiceData.invoiceDate).format('MMM Do YY');
//         const doc = new PDFDocument();

//         // Set headers for file download
//         res.setHeader('Content-disposition', `attachment; filename=invoice_${invoiceData.orderId}.pdf`);
//         res.setHeader('Content-type', 'application/pdf');

//         // Pipe the PDF document directly to the response
//         doc.pipe(res);

//         // Add content to the PDF
//         doc.fontSize(27).text('Invoice', { align: 'center' }).moveDown();

//         // Add invoice details
//         doc.fontSize(12)
//             .text(`Invoice Date: ${formattedDate}`, 50, 100)
//             .text(`Invoice Number: ${invoiceData.orderId}`, 50, 120)
//             .moveDown();

//         // Add customer information
//         doc.fontSize(14).text('Customer Information:', 50, 150)
//             .fontSize(12)
//             .text(`Name: ${invoiceData.customerName}`, 50, 170)
//             .text(`Email: ${invoiceData.customerEmail}`, 50, 190)
//             .text(`Mobile: ${invoiceData.customerMobile}`, 50, 210)
//             .text(`Address: ${invoiceData.address.address}, ${invoiceData.address.city}, ${invoiceData.address.state} - ${invoiceData.address.pincode}`, 50, 230)
//             .moveDown();

//         // Add table headers for order details
//         const startX = 50;
//         const startY = 270;
//         const columnWidths = {
//             itemName: 250, // Increased width for better alignment
//             quantity: 100,
//             unitPrice: 100,
//             total: 100,
//         };

//         doc.fontSize(14).text('Order Details:', startX, startY - 20);

//         // Draw table headers
//         doc.fontSize(12)
//             .text('Item Name', startX, startY, { width: columnWidths.itemName, underline: true })
//             .text('Quantity', startX + columnWidths.itemName, startY, { width: columnWidths.quantity, underline: true, align: 'center' })
//             .text('Unit Price', startX + columnWidths.itemName + columnWidths.quantity, startY, { width: columnWidths.unitPrice, underline: true, align: 'right' })
//             .text('Total', startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice, startY, { width: columnWidths.total, underline: true, align: 'right' })
//             .moveTo(startX, startY + 15)
//             .lineTo(startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice + columnWidths.total, startY + 15)
//             .stroke();

//         // Start Y position for product details
//         let y = startY + 20;

//         // Loop through order items and add them to the table
//         invoiceData?.orderItems?.forEach((item) => {
//             const total = item.quantity * item.price;
//             const rowHeight = Math.max(25, Math.ceil(doc.heightOfString(item.itemName, { width: columnWidths.itemName }) / 12) * 12); // Dynamic height based on item name length

//             // Draw borders for each row
//             doc.moveTo(startX, y - 5)
//                 .lineTo(startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice + columnWidths.total, y - 5)
//                 .stroke();

//             // Draw text within each column
//             doc.fontSize(12)
//                 .text(item.itemName, startX, y, { width: columnWidths.itemName, align: 'left', continued: true }) // Use continued to allow text wrapping
//                 .text('', { width: columnWidths.itemName, height: rowHeight }) // To create a new line if necessary
//                 .text(item.quantity.toString(), startX + columnWidths.itemName, y, { width: columnWidths.quantity, align: 'center' })
//                 .text(`${Number(item.price).toFixed(2)}`, startX + columnWidths.itemName + columnWidths.quantity, y, { width: columnWidths.unitPrice, align: 'right' })
//                 .text(`${total.toFixed(2)}`, startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice, y, { width: columnWidths.total, align: 'right' });

//             y += rowHeight + 5; // Adjust y position based on dynamic row height
//         });

//         // Draw borders for the last row
//         doc.moveTo(startX, y - 5)
//             .lineTo(startX + columnWidths.itemName + columnWidths.quantity + columnWidths.unitPrice + columnWidths.total, y - 5)
//             .stroke();

//         // Add subtotal, shipping, and total amounts
//         // Add subtotal, shipping, taxes, redeem coin discount, and total amounts
//         doc.fontSize(12)
//             .text(`Subtotal: ${invoiceData.subTotal.toFixed(2)}`, 400, y + 20, { align: 'right' })
//             .text(`Shipping Charges: ${Number(invoiceData.shipping_charge).toFixed(2)}`, 400, y + 40, { align: 'right' })
//             .text(`Taxes: ${Number(invoiceData.taxes).toFixed(2)}`, 400, y + 60, { align: 'right' }) // Display taxes
//             .text(`Redeem Coins Discount: -${Number(invoiceData.redeemCoinDiscount).toFixed(2)}`, 400, y + 80, { align: 'right' }) // Display redeem coins discount
//             .fontSize(16)
//             .text(`Grand Total: Rs.${Number(invoiceData.grandTotal).toFixed(2)}`, 400, y + 100, { bold: true, align: 'right' }); // Adjust grand total after discounts and taxes

//         // Finalize the PDF
//         doc.end();

//         // Resolve the promise when PDF is done writing
//         doc.on('finish', () => {
//             resolve();
//         });

//         // Handle errors during PDF generation
//         doc.on('error', (error) => {
//             console.error('Error during PDF generation:', error);
//             reject(error);
//         });
//     });
// };

const logoPath = path.join(__dirname, '../../public/Janhit.png');
const logoBase64 = fs.readFileSync(logoPath, 'base64');

exports.newGenerateInvoice = async (invoiceData, res) => {
    try {
        // Load HTML template
        const htmlTemplate = fs.readFileSync(path.join(__dirname, '../../public/invoiceTemplate.html'), 'utf8');

        // Compile the template with dynamic data
        const template = Handlebars.compile(htmlTemplate);
        const html = template({
            invoiceDate: moment(invoiceData.invoiceDate).format('DD-MM-YYYY HH:mm:ss'),
            invoiceNumber: invoiceData.orderId,
            customerName: invoiceData.customerName,
            shippingAddress: `${invoiceData.address.address}, ${invoiceData.address.city}, ${invoiceData.address.state} - ${invoiceData.address.pincode}`,
            orderItems: invoiceData.orderItems.map((item, index) => ({
                sn: index + 1,
                itemName: item.itemName,
                quantity: item.quantity || 0, // Ensure quantity is not undefined
                price: (item.price || 0).toFixed(2), // Fallback to 0 if price is undefined
                discount: (item.discount || 0), // Fallback to 0 if discount is undefined
                taxableValue: ((item.price || 0) * (item.quantity || 0) - (item.discount || 0)).toFixed(2),
                tax: (item.tax || 0).toFixed(2), // Fallback to 0 if tax is undefined
                total: item.total,
                grossAmount: ((item.price || 0) * (item.quantity || 0) - (item.discount || 0) + (item.tax || 0)).toFixed(2),

            })),

            redeemCoinDiscount: (invoiceData.redeemCoinDiscount || 0).toFixed(2),
            subTotal: (invoiceData.subTotal || 0).toFixed(2),
            shippingCharge: (invoiceData.shipping_charge || 0).toFixed(2),
            taxes: (invoiceData.taxes || 0).toFixed(2),
            grandTotal: (invoiceData.grandTotal || 0).toFixed(2),
            logoBase64: `data:image/png;base64,${logoBase64}`
        });

        // Launch Puppeteer to create the PDF

        // Launch Puppeteer to create the PDF
        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--headless', // Enable headless mode (no graphical interface)
                '--disable-gpu', // Disable GPU acceleration (optional but can help on some systems)
            ],
        });

        const page = await browser.newPage();

        // Set the content and wait for it to load
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        await page.emulateMediaType('screen');

        // Generate the PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            path: 'invoice.pdf', // Optionally save to a file
        });

        // Set the headers for the PDF download
        res.setHeader('Content-disposition', `attachment; filename=invoice_${invoiceData.orderId}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        // Send the PDF as the response
        res.end(pdfBuffer);

        await browser.close();
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
    }
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

/*
exports.generateProductsCSV = async (products, filename = 'products_export.csv') => {
    const reportsDir = path.join(__dirname, '../reports');
    fs.mkdirSync(reportsDir, { recursive: true });

    const filePath = path.join(reportsDir, filename);

    const headers = [
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
        
        // Variants (up to 3)
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
    ];

    const records = await Promise.all(products.map(async p => {
        const variant = p.variant || [];

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
            isRequirePrescription: p.isRequirePrescription ? 'Yes' : 'No',

            v1_size: variant[0]?.size || '',
            v1_color: variant[0]?.color || '',
            v1_price: variant[0]?.price || '',
            v1_quantity: variant[0]?.quantity || '',
            v1_discount_name: variant[0]?.discount?.name || '',

            v2_size: variant[1]?.size || '',
            v2_color: variant[1]?.color || '',
            v2_price: variant[1]?.price || '',
            v2_quantity: variant[1]?.quantity || '',
            v2_discount_name: variant[1]?.discount?.name || '',

            v3_size: variant[2]?.size || '',
            v3_color: variant[2]?.color || '',
            v3_price: variant[2]?.price || '',
            v3_quantity: variant[2]?.quantity || '',
            v3_discount_name: variant[2]?.discount?.name || ''
        };
    }));

    const csvWriter = createObjectCsvWriter({ path: filePath, header: headers });

    await csvWriter.writeRecords(records); 

    return filePath;
};
*/
