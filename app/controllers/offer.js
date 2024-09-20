const { isValidObjectId } = require("mongoose");
const { Offer } = require("../modals");
const { handleResponse, handleError, getPagination } = require("../utils/helper");

exports.createOffer = async (req, res) => {
    try {
        const { title, description, validateTo, coupon_code, discount, discount_type } = req.body
        let file_URL = `${process.env.BASE_URL}/media/${req?.file?.filename}`

        const data = { title, description, validateTo, offerBanner: file_URL, coupon_code, discount, discount_type }
        const newOffer = new Offer(data);

        await newOffer.save();

        handleResponse(res, newOffer._doc, 'Offer added successfully.', 201)

    } catch (error) {
        handleError(error.message, 400, res)
    }
}


exports.find = async (req, res) => {
    try {
        const { role, q, page = 1, limit = 10, sort } = req.query;

        const searchFilter = q ? {
            $or: [
                { title: { $regex: new RegExp(q, 'i') } },
                { validateTo: { $regex: new RegExp(q, 'i') } }
            ]
        } : {};

        const offer = await Offer.find({ ...searchFilter }).skip((page - 1) * limit).limit(parseInt(limit))

        const totalCount = await Offer.countDocuments({ ...searchFilter });

        // Generate the pagination result
        const getPaginationResult = await getPagination(req.query, offer, totalCount);

        // Handle the response
        handleResponse(res, getPaginationResult, 200);

    } catch (error) {
        handleError(error.message, 400, res);
    }
};


exports.findOne = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid Brand ID format', 400, res);
        }

        const offer = await Offer.findOne({ _id: id })

        if (!offer) {
            handleError('Offer is not exist.', 400, res)
            return
        }

        const offerData = await Offer.findOne({ _id: offer._id })

        handleResponse(res, offerData._doc, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.update = async (req, res) => {
    try {
        const { title, description, validateTo, coupon_code, discount, discount_type } = req.body
        const { id } = req.params;


        if (!isValidObjectId(id)) {
            return handleError('Invalid Brand ID format', 400, res);
        }

        const offer = await Offer.findOne({ _id: id })

        if (!offer) {
            handleError('Invailid Offer ID.', 400, res)
            return
        }

        let file_URL = req?.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : offer.offerBanner

        const data = { title, description, validateTo, offerBanner: file_URL, coupon_code, discount, discount_type }

        await Offer.updateOne({ _id: offer._id }, data, { new: true })

        res.status(200).send({ message: "Offer has been successfully update.", error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return handleError('Invalid Offer ID format', 400, res);
        }

        const offer = await Offer.findOne({ _id: id })

        if (!offer) {
            handleError('Offer ID is not exist.', 400, res)
            return
        }

        await Offer.deleteOne({ _id: offer._id })

        handleResponse(res, { message: 'Offer successfully removed.' }, 'Offer successfully removed.', 200)
    }
    catch (error) {
        handleError(error.message, 400, res)
    };
};

