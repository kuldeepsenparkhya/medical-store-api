const { Media } = require("../modals");
const { handleError } = require("../utils/helper");




exports.addProductMedia = async (req, res) => {
    try {
        const { product_id } = req.params;

        const media = await Media.findOne({ product_id: product_id })

        if (!media) {
            handleError('Invailid media ID.', 400, res)
            return;
        }


        if (!req.files) {
            handleError('Missing file.', 400, res)
            return;
        }

        const files = [];
        
        if (req?.files && Array.isArray(req?.files)) {
            req?.files?.forEach((val) => {
                files.push({
                    url: `/media/${val.filename}`,
                    mimetype: val.mimetype,
                    product_id: media.product_id
                });
            });

            // Save file metadata
            await Media.insertMany(files); // Use insertMany to handle multiple documents
        }

        res.status(200).send({ message: "Media has been successfully added.", error: false })

    } catch (error) {
        handleError(error.message || 'An unexpected error occurred', 400, res);
    }
}


exports.updateProductMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { product_id } = req.body;

        if (!req.file) {
            handleError('Missing file.', 400, res)
            return;
        }

        const media = await Media.findOne({ _id: id, product_id: product_id })

        if (!media) {
            handleError('Invailid media ID.', 400, res)
            return;
        }

        const data = {
            url: req.file ? `/media/${req?.file?.filename}` : '',
            mimetype: req.file.mimetype,
        }

        await Media.updateOne({ _id: media._id, product_id: media.product_id }, data, { new: true })

        res.status(200).send({ message: "Media has been successfully update.", error: false })

    } catch (error) {
        handleError(error.message || 'An unexpected error occurred', 400, res);
    }
}


exports.removeProductMediaById = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await Media.findOne({ _id: id })

        if (!media) {
            handleError('Invailid media ID.', 400, res)
            return;
        }

        await Media.deleteOne({ _id: media._id, product_id: media.product_id })

        res.status(200).send({ message: "Media has been successfully deleted.", error: false })

    } catch (error) {
        handleError(error.message || 'An unexpected error occurred', 400, res);
    }
}