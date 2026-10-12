const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { createAuditLog } = require("../services/auditService");
const { upload } = require("../utils/upload");
const {
  parseApplicationBody,
  createApplication
} = require("../services/applicationService");

const router = express.Router();

router.use(authenticate);

router.get("/", async (_req, res, next) => {
  try {
    const applications = await prisma.loanApplication.findMany({
      include: {
        business: true,
        riskScore: true,
        fieldOfficer: { select: { id: true, fullName: true, email: true } },
        loan: true
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
  authorize("SUPER_ADMIN", "RISK_ADMIN"),
  upload.fields([
    { name: "businessPhotos", maxCount: 6 },
    { name: "idDocument", maxCount: 2 },
    { name: "financialRecords", maxCount: 6 },
    { name: "supportingDocuments", maxCount: 6 }
  ]),
  async (req, res, next) => {
    try {
      const payload = parseApplicationBody(req.body);
      const files = Object.fromEntries(
        Object.entries(req.files || {}).map(([key, value]) => [
          key,
          value.map((file) => ({ ...file, publicPath: `/uploads/${file.filename}` }))
        ])
      );
      const created = await createApplication({
        prisma,
        payload,
        source: "INTERNAL",
        submittedById: req.user.id,
        files,
        auditUserId: req.user.id
      });

      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }
);

router.get("/:id", async (req, res, next) => {
  try {
    const application = await prisma.loanApplication.findUnique({
      where: { id: req.params.id },
      include: {
        business: true,
        riskScore: true,
        verificationReports: {
          include: {
            officer: { select: { id: true, fullName: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        loan: {
          include: {
            payments: { orderBy: { dueDate: "asc" } },
            repaymentSchedules: { orderBy: { dueDate: "asc" } }
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    return res.json({ application });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/assign-field-officer", authorize("SUPER_ADMIN", "RISK_ADMIN"), async (req, res, next) => {
  try {
    const { fieldOfficerId } = req.body;
    const officer = await prisma.user.findFirst({
      where: { id: fieldOfficerId, role: "FIELD_OFFICER" }
    });

    if (!officer) {
      return res.status(400).json({ message: "Valid field officer is required" });
    }

    const application = await prisma.loanApplication.update({
      where: { id: req.params.id },
      data: { fieldOfficerId }
    });

    await createAuditLog(prisma, {
      userId: req.user.id,
      action: "FIELD_OFFICER_ASSIGNED",
      entityType: "LoanApplication",
      entityId: application.id,
      metadata: { fieldOfficerId }
    });

    return res.json({ application });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
