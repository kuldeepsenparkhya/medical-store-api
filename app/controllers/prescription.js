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

        let file_URL = req?.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : ''
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
            .skip((page - 1) * limit)
            .limit(parseInt(limit))

        const totalCount = await Prescription.countDocuments()

        const getPaginationResult = await getPagination(req.query, prescription, totalCount);

        handleResponse(res, getPaginationResult, 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.findUserPrescription = async (req, res) => {
    try {
        const { role, q, page = 1, limit = 10, sort } = req.query;

        // Ensure page and limit are integers
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);

        // Validate page and limit
        if (isNaN(pageNumber) || pageNumber < 1) {
            throw new Error('Invalid page number');
        }
        if (isNaN(limitNumber) || limitNumber < 1) {
            throw new Error('Invalid limit number');
        }

        // Perform the query with pagination
        const prescriptions = await Prescription.find({ user_id: req.params.userID })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .sort(sort ? { [sort]: 1 } : {}); // Sort if provided

        // Get the total count of documents that match the query filter
        const totalCount = await Prescription.countDocuments({ user_id: req.params.userID });

        // Prepare pagination results
        const getPaginationResult = await getPagination(req.query, prescriptions, totalCount);

        // Send the response
        handleResponse(res, getPaginationResult, 200);
    } catch (error) {
        handleError(error.message, 400, res);
    }
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

        let file_URL = req?.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : prescription.url
        let mimetype = req?.file ? req?.file?.mimetype : prescription.mimetype

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