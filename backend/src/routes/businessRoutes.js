const express = require("express");
const prisma = require("../prisma");
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.use(authenticate);

router.get("/:id", async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: {
        applications: {
          include: {
            riskScore: true,
            loan: { include: { payments: true, repaymentSchedules: true } }
          },
          orderBy: { submittedAt: "desc" }
        }
      }
    });

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    return res.json({ business });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
