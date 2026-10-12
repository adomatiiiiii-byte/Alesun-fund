const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { verificationSchema } = require("../validators");
const { upload, toPublicPath } = require("../utils/upload");
const { createAuditLog } = require("../services/auditService");
const {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  extractRequestAuditContext
} = require("../services/auditLog.service");

const router = express.Router();

router.use(authenticate);

router.get("/assigned", authorize("FIELD_OFFICER", "ADMIN", "SUPER_ADMIN"), async (req, res, next) => {
  try {
    const where =
      req.user.role === "FIELD_OFFICER" ? { fieldOfficerId: req.user.id } : {};

    const applications = await prisma.loanApplication.findMany({
      where,
      include: {
        business: true,
        riskScore: true
      },
      orderBy: { submittedAt: "desc" }
    });

    return res.json({ applications });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/",
  authorize("FIELD_OFFICER", "ADMIN", "SUPER_ADMIN"),
  upload.array("attachments", 5),
  async (req, res, next) => {
    try {
      const payload = verificationSchema.parse({
        ...req.body,
        businessExists: req.body.businessExists === "true" || req.body.businessExists === true,
        stockMatchesClaims:
          req.body.stockMatchesClaims === "true" || req.body.stockMatchesClaims === true,
        customerActivityVerified:
          req.body.customerActivityVerified === "true" ||
          req.body.customerActivityVerified === true
      });

      const application = await prisma.loanApplication.findUnique({
        where: { id: payload.applicationId }
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (
        req.user.role === "FIELD_OFFICER" &&
        application.fieldOfficerId &&
        application.fieldOfficerId !== req.user.id
      ) {
        return res.status(403).json({ message: "Verification is assigned to another officer" });
      }

      const report = await prisma.$transaction(async (tx) => {
        const created = await tx.verificationReport.create({
          data: {
            applicationId: payload.applicationId,
            officerId: req.user.id,
            businessExists: payload.businessExists,
            stockMatchesClaims: payload.stockMatchesClaims,
            customerActivityVerified: payload.customerActivityVerified,
            ownerInterviewNotes: payload.ownerInterviewNotes,
            attachments: (req.files || []).map((file) => toPublicPath(file.path))
          }
        });

        await createAuditLog(tx, {
          userId: req.user.id,
          action: AUDIT_ACTIONS.VERIFICATION_COMPLETED,
          entityType: AUDIT_ENTITY_TYPES.VERIFICATION,
          entityId: created.id,
          performedBy: req.user.id,
          role: req.user.role,
          newValue: {
            businessExists: payload.businessExists,
            stockMatchesClaims: payload.stockMatchesClaims,
            customerActivityVerified: payload.customerActivityVerified
          },
          metadata: {
            applicationId: payload.applicationId,
            attachmentsCount: (req.files || []).length
          },
          ...extractRequestAuditContext(req)
        });

        return created;
      });

      return res.status(201).json({ report });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
