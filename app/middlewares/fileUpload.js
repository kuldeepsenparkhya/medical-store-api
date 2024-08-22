const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");

exports.fileUploader = (req, res, next) => {
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
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "application/pdf" ||
      file.mimetype === "video/mp4" ||
      file.mimetype === "video/webm" ||
      file.mimetype === "audio/mpeg" ||
      file.mimetype === "audio/mp3" ||
      file.mimetype === "audio/wav"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  };

  const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 * 5 },
    fileFilter: fileFilter,
  });
  
  console.log('req.body>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', req.body); // Log request body

  upload.single("pic")(req, res, next);
};