const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const debitNoteController = require("../controllers/debit_note.controller");
const debitNoteValidator = require("../validations/debit_note.validator");
const checkAccess = require("../../../middleware/permission.middleware");

const uploadImage = async (req, res, next) => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./uploads/debit_note");
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 1024 * 1024 * 5, // 5 MB
    },
    fileFilter: (req, file, cb) => {
      if (
        file.mimetype == "image/png" ||
        file.mimetype == "image/jpg" ||
        file.mimetype == "image/jpeg"
      ) {
        cb(null, true);
      } else {
        return cb(
          new Error(
            "Only files with the following extensions are allowed: png,jpg,jpeg "
          )
        );
      }
    },
  });

  const uploadSingleImage = upload.single("signatureImage");
  uploadSingleImage(req, res, function (err) {
    if (err) {
      data = {
        message: err.message,
      };
      return response.validation_error_message(data, res);
    }
    next();
  });
};

// Middleware for resizing uploaded images
const resizeImages = async (req, res, next) => {
  try {
    if (req.files) {
      await Promise.all(
        req.files.map(async (file) => {
          await sharp(file.path)
            .resize({ width: 40 })
            .toFile(file.path.replace(/(?=\.[^.]+$)/, "-resized"));

          // Delete the original image
          fs.unlinkSync(file.path);

          // Rename the resized image to the original filename
          fs.renameSync(
            file.path.replace(/(?=\.[^.]+$)/, "-resized"),
            file.path
          );
        })
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};

//Clone the data
router.post(
  "/:id/clone",
  checkAccess.checkAccess("debitNote", "create"),
  debitNoteController.clonedDebitNote
);

//Add Data
router.post(
  "/addData",
  checkAccess.checkAccess("debitNote", "create"),
  uploadImage,
  resizeImages,
  debitNoteValidator.create,
  debitNoteController.create
);

router.get("/getDebitNoteNumber", debitNoteController.getDebitNoteNumber);
//List All Data
router.get(
  "/",
  checkAccess.checkAccess("debitNote", "view"),
  debitNoteController.list
);

//Update Data
router.put(
  "/:id",
  checkAccess.checkAccess("debitNote", "update"),
  uploadImage,
  resizeImages,
  debitNoteValidator.create,
  debitNoteController.update
);

//View Data by Id
router.get(
  "/:id",
  checkAccess.checkAccess("debitNote", "view"),
  debitNoteController.view
);

// Soft delete vendor
router.patch(
  "/:id/softDelete",
  checkAccess.checkAccess("debitNote", "delete"),
  debitNoteController.softDelete
);

module.exports = router;
