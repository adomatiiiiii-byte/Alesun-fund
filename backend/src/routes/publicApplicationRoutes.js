const express = require("express");
const fs = require("fs");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { upload } = require("../utils/upload");
const { parseApplicationBody, createApplication } = require("../services/applicationService");
const { extractRequestAuditContext } = require("../services/auditLog.service");
const {
  buildStoredFileReference,
  financialMimeTypes,
  imageMimeTypes,
  removeUploadedFiles,
  resolveStoredFile,
  validateFileBucket
} = require("../utils/fileSecurity");
const { httpError } = require("../utils/httpError");

const router = express.Router();

router.post(
  "/applications",
  authenticate,
  authorize("APPLICANT"),
  upload.fields([
    { name: "businessPhotos", maxCount: 6 },
    { name: "passportPhoto", maxCount: 1 },
    { name: "idFrontImage", maxCount: 1 },
    { name: "idBackImage", maxCount: 1 },
    { name: "financialRecords", maxCount: 6 }
  ]),
  async (req, res, next) => {
    try {
      const payload = parseApplicationBody(req.body);
      validateFileBucket(req.files || {}, "businessPhotos", {
        required: true,
        maxCount: 6,
        mimeTypes: imageMimeTypes,
        maxSizeBytes: 5 * 1024 * 1024,
        label: "Business photos",
        allowedDescription: "JPG or PNG images"
      });
      validateFileBucket(req.files || {}, "passportPhoto", {
        required: true,
        maxCount: 1,
        mimeTypes: imageMimeTypes,
        maxSizeBytes: 5 * 1024 * 1024,
        label: "Recent passport photograph",
        allowedDescription: "a JPG or PNG image"
      });
      validateFileBucket(req.files || {}, "idFrontImage", {
        required: true,
        maxCount: 1,
        mimeTypes: imageMimeTypes,
        maxSizeBytes: 5 * 1024 * 1024,
        label: "ID front side",
        allowedDescription: "a JPG or PNG image"
      });
      validateFileBucket(req.files || {}, "idBackImage", {
        required: true,
        maxCount: 1,
        mimeTypes: imageMimeTypes,
        maxSizeBytes: 5 * 1024 * 1024,
        label: "ID back side",
        allowedDescription: "a JPG or PNG image"
      });
      validateFileBucket(req.files || {}, "financialRecords", {
        required: true,
        maxCount: 6,
        mimeTypes: financialMimeTypes,
        maxSizeBytes: 10 * 1024 * 1024,
        label: "Financial records",
        allowedDescription: "a JPG, PNG, or PDF file"
      });

      const files = Object.fromEntries(
        Object.entries(req.files || {}).map(([key, value]) => [
          key,
          value.map((file) => ({ ...file, reference: buildStoredFileReference(file) }))
        ])
      );

      const created = await createApplication({
        prisma,
        payload,
        source: "PUBLIC",
        submittedById: req.user.id,
        files,
        auditUserId: req.user.id,
        auditContext: extractRequestAuditContext(req)
      });

      return res.status(201).json({
        applicationId: created.application.id,
        message: "Your application has been received and is under review"
      });
    } catch (error) {
      removeUploadedFiles(req.files);
      return next(error);
    }
  }
);

router.get("/applications/mine", authenticate, authorize("APPLICANT"), async (req, res, next) => {
  try {
    const applications = await prisma.loanApplication.findMany({
      where: {
        submittedById: req.user.id,
        source: "PUBLIC"
      },
      include: {
        business: true
      },
      orderBy: { submittedAt: "desc" }
    });

    const sanitized = applications.map((application) => ({
      id: application.id,
      status: application.status,
      decisionNotes: application.decisionNotes,
      submittedAt: application.submittedAt,
      updatedAt: application.updatedAt,
      loanRequestAmount: application.loanRequestAmount,
      loanPurpose: application.loanPurpose,
      business: application.business
    }));

    return res.json({ applications: sanitized });
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/applications/:id/files/:field",
  authenticate,
  authorize("SUPER_ADMIN", "RISK_ADMIN"),
  async (req, res, next) => {
    try {
      const application = await prisma.loanApplication.findUnique({
        where: { id: req.params.id },
        select: {
          passportPhotoUrl: true,
          idFrontUrl: true,
          idBackUrl: true
        }
      });

      if (!application) {
        throw httpError(404, "Application not found");
      }

      const storedName = {
        passportPhoto: application.passportPhotoUrl,
        idFrontImage: application.idFrontUrl,
        idBackImage: application.idBackUrl
      }[req.params.field];

      if (!storedName) {
        throw httpError(404, "Requested file not found");
      }

      const absolutePath = resolveStoredFile(storedName);
      if (!fs.existsSync(absolutePath)) {
        throw httpError(404, "Stored file not found");
      }

      return res.sendFile(absolutePath);
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
