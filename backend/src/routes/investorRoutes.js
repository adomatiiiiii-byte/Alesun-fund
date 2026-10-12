const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const { buildInvestorDashboard, buildInvestorGeoSummary } = require("../services/investor.service");

const router = express.Router();

router.use(authenticate, authorize("INVESTOR", "SUPER_ADMIN"));

router.get("/overview", async (_req, res, next) => {
  try {
    const overview = await buildInvestorDashboard(prisma);
    return res.json(overview);
  } catch (error) {
    return next(error);
  }
});

router.get("/geo-summary", async (_req, res, next) => {
  try {
    const summary = await buildInvestorGeoSummary(prisma);
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
