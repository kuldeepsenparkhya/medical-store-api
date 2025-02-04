const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const { JWT_SECREATE } = require("../config/config");
const { handleError } = require("../utils/helper");



exports.authJWT = async (req, res, next) => {
  const pathArray = ['/api/login', '/api/media','/api/documents/privacyPolicy', '/api/social/login', '/api/auth/google', '/api/verify/otp', '/api/update/password', '/api/organizations/login', '/api/register', '/api/forgotPassword', '/api/reset-password', '/api/organizations/reset-password', '/api/organizations/update-password', '/api/update-password', '/api/email-resend', '/api/organizations/register', '/subscribe']

  if (pathArray.includes(req.path))
    return next()

  if (req.headers.authorization) {
    try {
      const data = await jwt.verify(req.headers.authorization, JWT_SECREATE)

      if (data.isBlocked) {
        return res.status(400).send({
          error: true,
          message: 'Your account has been blocked due to policy violations. If you believe this is a mistake, please contact support for further assistance.'
        })
      }

      req.user = data;
      return next()

    } catch (error) {


      // Handle token expiration and other errors
      if (error.name === 'TokenExpiredError') {
        return res.status(401).send({
          error: true,
          message: 'Session expired. Please log in again.'
        });
      } else {
        return res.status(401).send({
          error: true,
          message: 'Unauthorized access!'
        });

      }
    }
  }
  else {
    return res.status(401).send({
      error: true,
      message: 'Unauthorized access!'
    })
  }
}


exports.adminAccess = async (req, res, next) => {
  try {
    if (req?.user?.role === 'admin') {
      return next();
    }
    else {
      handleError('Access denied. Admins only.!', 401, res)
      return;
    }
  } catch (error) {
    handleError('Access denied. Admins only.!', 401, res)
    return;
  }
};


exports.multipleFileUploading = async (req, res, next) => {

  const BASE_PATH = __dirname
  const storage = multer.diskStorage({

    destination: function (req, file, cb) {
      cb(null, path.join(BASE_PATH, '../upload'))
    },

    filename: function (req, file, cb) {
      cb(null, Date.now() + file.originalname)
    },
  })

  const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpe' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'application/pdf' || file.mimetype === 'video/mp4' || file.mimetype === 'video/webm' || file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3' || file.mimetype === 'audio/wav') {
      cb(null, true)
    }
    else {
      cb(null, true)
    }
  }

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter
  })

  upload.fields([{ name: 'image', maxCount: 5 }, { name: 'vedio', maxCount: 5 }, { name: 'document', maxCount: 5 }])(req, res, next)

}