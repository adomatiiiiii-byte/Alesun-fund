const express = require("express");
const fs = require("fs");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { upload } = require("../utils/upload");
const { resolveStoredFile, removeUploadedFiles } = require("../utils/fileSecurity");
const { extractRequestAuditContext } = require("../services/auditLog.service");
const {
  getOnboardingStatus,
  saveOwnerInfo,
  saveBusinessInfo,
  submitDocuments
} = require("../services/onboarding.service");
const {
  onboardingStep1Schema,
  onboardingStep2Schema
} = require("../validators");
const { httpError } = require("../utils/httpError");

const router = express.Router();

router.use(authenticate, authorize("APPLICANT"));

router.get("/status", async (req, res, next) => {
  try {
    const status = await getOnboardingStatus(prisma, req.user.id);
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

router.post("/step1", async (req, res, next) => {
  try {
    const payload = onboardingStep1Schema.parse(req.body);
    const status = await saveOwnerInfo({
      prismaClient: prisma,
      userId: req.user.id,
      payload,
      userRole: req.user.role,
      auditContext: extractRequestAuditContext(req)
    });
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

router.post("/step2", async (req, res, next) => {
  try {
    const payload = onboardingStep2Schema.parse(req.body);
    const status = await saveBusinessInfo({
      prismaClient: prisma,
      userId: req.user.id,
      payload,
      userRole: req.user.role,
      auditContext: extractRequestAuditContext(req)
    });
    return res.json(status);
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/step3",
  upload.fields([
    { name: "idFrontImage", maxCount: 1 },
    { name: "idBackImage", maxCount: 1 },
    { name: "tradingLicense", maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const status = await submitDocuments({
        prismaClient: prisma,
        userId: req.user.id,
        files: req.files || {},
        userRole: req.user.role,
        auditContext: extractRequestAuditContext(req)
      });
      return res.json(status);
    } catch (error) {
      removeUploadedFiles(req.files);
      return next(error);
    }
  }
);

router.get("/files/:field", async (req, res, next) => {
  try {
    const documents = await prisma.document.findUnique({
      where: { userId: req.user.id }
    });

    if (!documents) {
      throw httpError(404, "Documents not found");
    }

    const storedName = {
      idFrontImage: documents.idFrontUrl,
      idBackImage: documents.idBackUrl,
      tradingLicense: documents.tradingLicenseUrl
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
});

module.exports = router;
