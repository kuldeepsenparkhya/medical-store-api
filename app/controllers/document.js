const { Document } = require("../modals");
const { handleError, handleResponse } = require("../utils/helper");


exports.createDocument = async (req, res) => {
    try {
        const { type, content } = req.body;

        // Validate input (optional, depending on requirements)
        if (!type || !content) {
            return handleError('Type and content are required.', 400, res);
        }

        // Create and save the new document
        const newDocument = new Document({ type, content });
        await newDocument.save();

        // Respond with success
        handleResponse(res, newDocument.toObject(), 'Document has been created successfully.', 201);
    } catch (error) {
        // Handle errors with detailed messages
        handleError(`Error creating document: ${error.message}`, 500, res);
    }
};


exports.getDocument = async (req, res) => {
    try {
        const { type } = req.body;
        if (!type) {
            return handleError('Document type is required.', 400, res);
        }

        const document = await Document.findOne({ type: type });

        if (!document) {
            return handleError('Document not found.', 404, res);
        }

        handleResponse(res, document._doc, 'Document has been successfully retrieved.', 200);
    } catch (error) {
        // Handle errors with detailed messages
        handleError(`Error retrieving document: ${error.message}`, 500, res);
    }
};


exports.updateDocument = async (req, res) => {
    try {
        const { type, content } = req.body;
        const { id } = req.params

        if (!type || !content) {
            return handleError('Document type and new content are required.', 400, res);
        }

        const document = await Document.findOne({ _id: id });
        if (!document) {
            return handleError('Invalid document ID', 400, res);
        }

        const updateData = { type, content }

        const updatedDocument = await Document.updateOne({ _id: req.params.id },
            updateData,
            { new: true }
        );

        if (!updatedDocument) {
            return handleError('Document not found.', 404, res);
        }

        handleResponse(res, [], 'Document has been successfully updated.', 200);
    } catch (error) {
        handleError(`Error updating document: ${error.message}`, 500, res);
    }
};