const { Order } = require("../modals")

exports.reminderOrder = async (req, res) => {
    try {
        const orders = await Order.find()
        var current = null;
        var cnt = 0;

        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            for (let j = 0; j < order.products.length; j++) {
                const product = order.products[j];

                const x = {
                    userID: order.user_id,
                    productID: product.product_id,
                    orderDate: order.createdAt
                }

                console.log('sssssss', x);

            }
        }

        return 'orders'

    } catch (error) {

    }
}