const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth");
const {
  buildGeoFilters,
  getGeoAgentOverlay,
  getGeoHeatmapData,
  getGeoRiskData
} = require("../services/geoIntelligence.service");

const router = express.Router();

router.use(authenticate, authorize("SUPER_ADMIN", "RISK_ADMIN", "FINANCE_ADMIN", "ADMIN"));

router.get("/heatmap-data", async (req, res, next) => {
  try {
    const filters = buildGeoFilters(req.query);
    const payload = await getGeoHeatmapData(prisma, filters);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.get("/agents", async (req, res, next) => {
  try {
    const filters = buildGeoFilters(req.query);
    const payload = await getGeoAgentOverlay(prisma, filters);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.get("/risk", async (req, res, next) => {
  try {
    const filters = buildGeoFilters(req.query);
    const payload = await getGeoRiskData(prisma, filters);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
