const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");

exports.bulkFileUploadProduct = (req, res, next) => {
  const BASE_PATH = path.join(__dirname, "../upload");
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, BASE_PATH);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + file.originalname);
    },
  });

  const fileFilter = (req, file, cb) => {
    {
      cb(null, true);
    }
  };

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
  });

  upload.single("files")(req, res, next);
};

exports.fileUploader = (req, res, next) => {
  const BASE_PATH = path.join(__dirname, "../upload");
  const storage = multer.memoryStorage(); // Store files in memory for processing
  const fileFilter = (req, file, cb) => {
    // Allow all file types for uploading
    cb(null, true);
  };

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
  });

  upload.single("files")(req, res, async (err) => {
    if (err) {
      return res.status(400).send(err);
    }

    const file = req?.file;

    if (!file) {
      return next(); // No file uploaded, move to the next middleware
    }

    const originalName = file?.originalname;
    const fileExtension = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();

    try {
      if (fileExtension === ".jpg" || fileExtension === ".jpeg" || fileExtension === ".png") {
        // Convert image to WebP
        const webpFilePath = path.join(BASE_PATH, `${timestamp}-${path.basename(originalName, fileExtension)}.webp`);
        await sharp(file.buffer)
          .toFormat("webp")
          .toFile(webpFilePath);

        // Store the path of the converted file in req for later use
        req.filePath = webpFilePath;
      } else {
        // For non-image files, save it directly
        const originalFilePath = path.join(BASE_PATH, `${timestamp}-${originalName}`);
        fs.writeFileSync(originalFilePath, file.buffer);

        // Store the path of the original file in req for later use
        req.filePath = originalFilePath;
      }

      next();
    } catch (processingError) {
      return res.status(500).send(processingError);
    }
  });
};

exports.filesUploader = (req, res, next) => {
  const BASE_PATH = path.join(__dirname, "../upload");
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, BASE_PATH);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + file.originalname);
    },
  });

  const fileFilter = (req, file, cb) => {
    cb(null, true);
  }

  const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 * 5 },
    fileFilter: fileFilter,
  });

  // upload.array("files")(req, res, next);
  upload.fields([{ name: 'productFiles', maxCount: 10 }, { name: 'brochure', maxCount: 1 }])(req, res, next)
};