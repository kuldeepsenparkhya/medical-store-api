const { default: mongoose } = require('mongoose');
const nodemailer = require('nodemailer');
const { SMPT_EMAIL_HOST, SMPT_EMAIL_PORT, SMPT_EMAIL_USER, SMPT_EMAIL_PASSWORD, SMPT_EMAIL_FROM } = require('../config/config');


exports.handleResponse = (res, data, status = 200) => res.status(status).json(data);

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

exports.getPagination = async (query, fetchedData, totalCount) => {
    const { page = 1, limit = 10, sort = 1,} = query;

    let paginatedData;
    let totalItems;

    if (Array.isArray(fetchedData)) {
        paginatedData = fetchedData.slice((page - 1) * limit, page * limit);
        totalItems = fetchedData.length;

    } else if (fetchedData instanceof mongoose.Query) {
        paginatedData = await fetchedData
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -sort })
            .exec();
        totalItems = await fetchedData.countDocuments();

    } else {
        throw new Error("Unsupported data type for pagination");
    }

    const paginationInfo = {
        data: paginatedData,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        totalItems: totalItems
    };

    return paginationInfo;
}

exports.sendMailer = async (email, subject, message, res) => {

    const transporter = nodemailer.createTransport({
        host: `${SMPT_EMAIL_HOST}`,
        port: `${SMPT_EMAIL_PORT}`,
        auth: {
            user: `${SMPT_EMAIL_USER}`,
            pass: `${SMPT_EMAIL_PASSWORD}`
        },
        secure: false
    })

    const data = {
        from: `${SMPT_EMAIL_FROM}`,
        to: `${email}`,
        subject: `${subject} - Food donation NGO`,
        html: `${message}`,
    }

    transporter.sendMail(data, (error, info) => {
        if (error) {
            console.log('error>>>>>>', error);
            res.status(error.responseCode).send(error)
        }
    })

    return
}

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