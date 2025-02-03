const { orders } = require('../controllers');
const { adminAccess } = require('../middlewares/auth');

var router = require('express').Router(); 3
const path = require("path");
const { fileUploader } = require('../middlewares/fileUpload');
const { Payment } = require('../modals');
const crypto = require('crypto-js');


module.exports = app => {
    router.post('/orders', fileUploader, orders.create);
    router.get('/orders', orders.findAllOrders);

    router.get('/orders/user/:user_id', adminAccess, orders.findOrdersByUserId);
    router.get('/user/orders', orders.findAllUserOrders);
    router.get('/orders/:id', orders.getOrderById);

    router.delete('/orders/:id', orders.cancelledOrder);

    router.patch('/orders/:id', adminAccess, orders.handleOrderStatus);

    router.post('/checkout', orders.checkout);




    // ROUTE 2 : Create Verify Api Using POST Method http://localhost:4000/api/payment/verify

    router.post('/payment/verify', async (req, res) => {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        try {
            // Create Sign
            const sign = razorpay_order_id + "|" + razorpay_payment_id;
            // Log the generated sign
            console.log('Generated sign:', sign);


            // Create ExpectedSign
            // const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET).update(sign.toString()).digest("hex");
            const expectedSign = crypto.HmacSHA256(sign, process.env.RAZORPAY_SECRET).toString(crypto.enc.Hex);

            // Log the expected signature
            console.log('Expected signature:', expectedSign);

            // Log the razorpay signature received in the request
            console.log('Razorpay Signature:', razorpay_signature);

            // Create isAuthentic
            const isAuthentic = expectedSign === razorpay_signature;

            console.log('isAuthentic>>>', isAuthentic);


            // Condition 
            if (isAuthentic) {
                const payment = new Payment({
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature
                });

                // Save Payment 
                await payment.save();

                // Send Message 
                res.status(200).send({
                    message: "Payement Successfully",
                    error: false
                });
            }
        } catch (error) {
            res.status(500).json({ message: "Internal Server Error!" });
            console.log(error);
        }
    })


    router.get('/payment/:paymentId', orders.payment);
    router.get('/payments', orders.getAllPayments);

    router.get('/sales/report', orders.salesReport);

    // -------------------------- Generate Oder Invoice---------------------------------------------//
    router.get('/invoices/generate/:orderID', orders.downloadInvoice)
    // -----------------------------------------------------------------------//

    app.use('/api', router);
};