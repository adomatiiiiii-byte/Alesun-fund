const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { manualPasswordResetSchema } = require("../validators");
const { manualPasswordReset } = require("../services/passwordReset.service");
const { extractRequestAuditContext } = require("../services/auditLog.service");

const router = express.Router();

router.post(
  "/manual-password-reset",
  authenticate,
  authorize("SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const payload = manualPasswordResetSchema.parse(req.body);
      await manualPasswordReset(prisma, req.user, payload, extractRequestAuditContext(req));
      return res.json({
        message: "Temporary password created. The account holder must change it on next login."
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
