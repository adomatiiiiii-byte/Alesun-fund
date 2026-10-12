const fs = require("fs");
const path = require("path");
const { uploadDir } = require("../config");
const { httpError } = require("./httpError");

const imageMimeTypes = new Set(["image/jpeg", "image/png"]);
const financialMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);

function removeUploadedFiles(files = {}) {
  Object.values(files)
    .flat()
    .forEach((file) => {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
}

function validateFileBucket(
  files,
  key,
  { required = true, maxCount = 1, mimeTypes, maxSizeBytes, label, allowedDescription = "supported" }
) {
  const bucket = files[key] || [];

  if (required && !bucket.length) {
    throw httpError(400, `${label} is required`);
  }

  if (bucket.length > maxCount) {
    throw httpError(400, `${label} must not exceed ${maxCount} file(s)`);
  }

  bucket.forEach((file) => {
    if (mimeTypes && !mimeTypes.has(file.mimetype)) {
      throw httpError(400, `${label} must be ${allowedDescription}`);
    }
    if (maxSizeBytes && file.size > maxSizeBytes) {
      throw httpError(400, `${label} exceeds the allowed file size`);
    }
  });
}

function buildStoredFileReference(file) {
  return {
    storedName: path.basename(file.path),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}

function resolveStoredFile(storedName) {
  const absolutePath = path.resolve(uploadDir, storedName);
  if (!absolutePath.startsWith(uploadDir)) {
    throw httpError(400, "Invalid file path");
  }
  return absolutePath;
}

module.exports = {
  buildStoredFileReference,
  financialMimeTypes,
  imageMimeTypes,
  removeUploadedFiles,
  resolveStoredFile,
  validateFileBucket
};
