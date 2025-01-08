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