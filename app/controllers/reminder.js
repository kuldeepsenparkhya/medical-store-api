const { Order } = require("../modals")

exports.reminderOrder = async (req, res) => {
    try {
        const orders = await Order.find()

        function getUniqueDataCount(objArr, propName) {
            const countMap = {};

            objArr.forEach(order => {
                if (Array.isArray(propName)) {
                    propName.forEach(prop => {
                        if (order[prop]) {
                            countMap[order[prop]] = (countMap[order[prop]] || 0) + 1;
                        }
                    });
                } else {
                    if (order[propName]) {
                        countMap[order[propName]] = (countMap[order[propName]] || 0) + 1;
                    }
                }
            });

            const finalData = Object.keys(countMap).map(key => ({
                [propName]: key,
                count: countMap[key]
            }));

            return finalData
        }

        return getUniqueDataCount(orders, ['user_id'])


    } catch (error) {

    }
}