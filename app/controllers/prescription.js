const { Prescription } = require("../modals");
const { handleResponse, handleError, getPagination } = require("../utils/helper");
const { createPrescriptions } = require("./joiValidator/prescriptionJoiSchema");

exports.create = async (req, res) => {
    try {
        const { user_id } = req.body
        const { error } = createPrescriptions.validate(req.body, { abortEarly: false });

        if (error) {
            handleError(error, 400, res);
            return
        };

        let file_URL = req?.file ? `/media/${req?.file?.filename}` : ''
        let mimetype = req?.file ? req?.file?.mimetype : ''

        const data = { url: file_URL, mimetype: mimetype, user_id: user_id, status: 'pending' }

        const prescription = new Prescription(data);
        await prescription.save();

        handleResponse(res, data, 'Your prescription has been successfully submit.', 201);
    } catch (error) {
        handleError(error.message || 'An unexpected error occurred', 400, res);
    }
}


exports.find = async (req, res) => {
    try {
        const { role, q, page = 1, limit = 10, sort } = req.query;
        const searchFilter = q ? {
            $or: [
                { status: { $regex: new RegExp(q, 'i') } },
            ]
        } : {};

        const prescription = await Prescription.find({ ...searchFilter })
            .skip((page - 1) * limit)  // Skip the records for previous pages
            .limit(parseInt(limit))   // Limit the number of records returned
        // .sort({ name: sort });    // Sort if needed (assuming sorting is done by 'name')


        const totalCount = await Prescription.countDocuments()

        const getPaginationResult = await getPagination(req.query, prescription, totalCount);

        handleResponse(res, getPaginationResult, 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.findOne = async (req, res) => {
    try {

        const { id } = req.params

        const prescription = await Prescription.findOne({ _id: id })

        if (!prescription) {
            handleError('Invailid prescription ID.', 400, res)
            return
        }

        handleResponse(res, prescription._doc, 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};



exports.handlePrescriptionRequest = async (req, res) => {
    try {
        const { status } = req.body

        console.log('status<<<<<<<', status);

        const { id } = req.params;

        const prescription = await Prescription.findOne({ _id: id })

        if (!prescription) {
            handleError('Invailid prescription ID.', 400, res)
            return
        }

        await Prescription.updateOne({ _id: prescription._id }, { status: status }, { new: true })

        res.status(200).send({ message: `Prescription has been successfully ${status}`, error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    };
};



exports.update = async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescription.findOne({ _id: id })

        if (!prescription) {
            handleError('Invailid prescription ID.', 400, res)
            return
        }

        let file_URL = req?.file ? `/media/${req?.file?.filename}` : ''
        let mimetype = req?.file ? req?.file?.mimetype : ''

        const data = { url: file_URL, mimetype: mimetype }

        await Prescription.updateOne({ _id: prescription._id }, data, { new: true })

        res.status(200).send({ message: `Prescription has been successfully updated`, error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescription.findOne({ _id: id })

        if (!prescription) {
            handleError('Invailid prescription ID.', 400, res)
            return
        }

        await Prescription.deleteOne({ _id: brand._id })

        handleResponse(res, { message: 'Pescription successfully removed.' }, 'Prescription successfully removed.', 200)
    }
    catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.handleDeletePrescriptions = async (req, res) => {
    try {
        const { id } = req.params;
        const prescription = await Prescription.findOne({ _id: id })

        if (!prescription) {
            handleError('Invailid prescription ID.', 400, res)
            return
        }

        await Prescription.updateOne({ _id: prescription._id }, { isDeleted: true }, { new: true })

        res.status(200).send({ message: `Prescription has been successfully removed`, error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    };
};