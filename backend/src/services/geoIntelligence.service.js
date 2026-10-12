const { getGeoCatalog } = require("./geography.service");

const REGION_BOUNDS = {
  Central: { minLat: 0.05, maxLat: 1.85, minLng: 31.1, maxLng: 33.25 },
  Eastern: { minLat: 0.15, maxLat: 2.2, minLng: 33.25, maxLng: 35.1 },
  Northern: { minLat: 2.2, maxLat: 4.35, minLng: 31.2, maxLng: 34.9 },
  Western: { minLat: -1.25, maxLat: 1.95, minLng: 29.55, maxLng: 31.1 }
};

const SUBREGION_BOUNDS = {
  Central: {
    Kampala: { minLat: 0.22, maxLat: 0.43, minLng: 32.48, maxLng: 32.68 },
    "Buganda North": { minLat: 0.5, maxLat: 1.75, minLng: 31.25, maxLng: 33.05 },
    "Buganda South": { minLat: -0.75, maxLat: 0.7, minLng: 31.15, maxLng: 32.95 }
  },
  Northern: {
    Acholi: { minLat: 2.45, maxLat: 3.65, minLng: 31.7, maxLng: 33.15 },
    Lango: { minLat: 1.75, maxLat: 2.55, minLng: 32.15, maxLng: 33.55 },
    Karamoja: { minLat: 2.1, maxLat: 3.85, minLng: 33.65, maxLng: 34.95 },
    "West Nile": { minLat: 2.25, maxLat: 3.65, minLng: 30.55, maxLng: 31.95 }
  },
  Eastern: {
    Busoga: { minLat: 0.02, maxLat: 1.08, minLng: 33.0, maxLng: 34.25 },
    Bukedi: { minLat: 0.08, maxLat: 1.18, minLng: 33.95, maxLng: 34.95 },
    Elgon: { minLat: 0.75, maxLat: 1.8, minLng: 34.05, maxLng: 34.95 },
    Teso: { minLat: 1.0, maxLat: 2.12, minLng: 33.2, maxLng: 34.4 }
  },
  Western: {
    Bunyoro: { minLat: 0.82, maxLat: 2.22, minLng: 30.45, maxLng: 32.05 },
    Toro: { minLat: 0.02, maxLat: 1.55, minLng: 29.55, maxLng: 31.25 },
    Ankole: { minLat: -1.02, maxLat: 0.52, minLng: 30.1, maxLng: 31.75 },
    Kigezi: { minLat: -1.45, maxLat: -0.45, minLng: 29.52, maxLng: 30.72 }
  }
};

const REGION_ORDER = ["Central", "Eastern", "Northern", "Western"];
const GEO_CACHE_TTL_MS = 30 * 1000;
let geoCache = new Map();

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMetric(value) {
  return Math.round(asNumber(value) * 100) / 100;
}

function percentage(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return roundMetric((asNumber(numerator) / asNumber(denominator)) * 100);
}

function normalizeValue(value) {
  return String(value || "").trim();
}

function matchesFilter(value, expected) {
  if (!expected) {
    return true;
  }

  return normalizeValue(value).toLowerCase() === normalizeValue(expected).toLowerCase();
}

function buildCacheKey(type, filters = {}) {
  return JSON.stringify({
    type,
    region: filters.region || "",
    district: filters.district || "",
    status: filters.status || ""
  });
}

function withCache(type, filters, builder) {
  const cacheKey = buildCacheKey(type, filters);
  const cached = geoCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = builder();
  geoCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + GEO_CACHE_TTL_MS
  });
  return value;
}

function invalidateGeoIntelligenceCache() {
  geoCache = new Map();
}

function getSubregionBounds(regionName, subregionName, regionBounds) {
  return SUBREGION_BOUNDS[regionName]?.[subregionName] || regionBounds;
}

function buildDistrictGeometry() {
  const catalog = getGeoCatalog();
  const regionFeatures = [];
  const districtFeatures = [];
  const districtLookup = new Map();

  for (const regionEntry of catalog) {
    const regionName = regionEntry.region;
    const bounds = REGION_BOUNDS[regionName];
    if (!bounds) {
      continue;
    }

    regionFeatures.push({
      type: "Feature",
      properties: {
        region: regionName
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
          [bounds.minLng, bounds.maxLat],
          [bounds.minLng, bounds.minLat]
        ]]
      }
    });

    regionEntry.subregions.forEach((subregionEntry) => {
      const subregionBounds = getSubregionBounds(regionName, subregionEntry.subregion, bounds);
      const districts = subregionEntry.districts.map((district) => ({
        region: regionName,
        subregion: subregionEntry.subregion,
        district: district.district,
        districtType: district.type
      }));
      const columns = Math.max(2, Math.ceil(Math.sqrt(districts.length)));
      const rows = Math.max(2, Math.ceil(districts.length / columns));
      const latStep = (subregionBounds.maxLat - subregionBounds.minLat) / rows;
      const lngStep = (subregionBounds.maxLng - subregionBounds.minLng) / columns;
      const latInset = latStep * 0.16;
      const lngInset = lngStep * 0.16;

      districts.forEach((districtEntry, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        const cellMinLat = subregionBounds.minLat + row * latStep;
        const cellMaxLat = cellMinLat + latStep;
        const cellMinLng = subregionBounds.minLng + column * lngStep;
        const cellMaxLng = cellMinLng + lngStep;
        const minLat = cellMinLat + latInset;
        const maxLat = cellMaxLat - latInset;
        const minLng = cellMinLng + lngInset;
        const maxLng = cellMaxLng - lngInset;
        const centroid = {
          lat: roundMetric((minLat + maxLat) / 2),
          lng: roundMetric((minLng + maxLng) / 2)
        };

        const feature = {
          type: "Feature",
          properties: {
            region: regionName,
            subregion: districtEntry.subregion,
            district: districtEntry.district,
            districtType: districtEntry.districtType,
            centroid
          },
          geometry: {
            type: "Polygon",
            coordinates: [[
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat]
            ]]
          }
        };

        districtFeatures.push(feature);
        districtLookup.set(`${regionName.toLowerCase()}::${districtEntry.district.toLowerCase()}`, {
          region: regionName,
          subregion: districtEntry.subregion,
          district: districtEntry.district,
          districtType: districtEntry.districtType,
          centroid,
          feature
        });
      });
    });
  }

  return {
    regionGeoJson: {
      type: "FeatureCollection",
      features: regionFeatures
    },
    districtGeoJson: {
      type: "FeatureCollection",
      features: districtFeatures
    },
    districtLookup
  };
}

const DISTRICT_GEOMETRY = buildDistrictGeometry();

function getDistrictMeta(region, district) {
  return DISTRICT_GEOMETRY.districtLookup.get(`${normalizeValue(region).toLowerCase()}::${normalizeValue(district).toLowerCase()}`) || null;
}

function classifyRisk(defaultRate, overdueRate) {
  const riskScore = roundMetric(defaultRate * 0.6 + overdueRate * 0.4);
  const level = riskScore >= 35 ? "HIGH" : riskScore >= 15 ? "MEDIUM" : "LOW";

  return { riskScore, riskLevel: level };
}

function classifyGrowthTrend(todayValue, baselineValue) {
  if (!todayValue && !baselineValue) {
    return "STABLE";
  }

  if (!baselineValue && todayValue > 0) {
    return "UP";
  }

  const delta = baselineValue ? ((todayValue - baselineValue) / baselineValue) * 100 : 0;
  if (delta > 10) {
    return "UP";
  }
  if (delta < -10) {
    return "DOWN";
  }
  return "STABLE";
}

function buildGeoFilters(query = {}) {
  return {
    region: normalizeValue(query.region),
    district: normalizeValue(query.district),
    status: normalizeValue(query.status).toUpperCase()
  };
}

async function fetchGeoBaseData(prismaClient) {
  const [loans, repayments, agents] = await Promise.all([
    prismaClient.loan.findMany({
      select: {
        id: true,
        agentId: true,
        region: true,
        district: true,
        status: true,
        principal: true,
        principalAmount: true,
        disbursedAmount: true,
        processingFee: true,
        totalRepayableAmount: true,
        remainingBalance: true,
        daysLate: true,
        createdAt: true,
        disbursedAt: true
      }
    }),
    prismaClient.loanRepayment.findMany({
      select: {
        id: true,
        loanId: true,
        agentId: true,
        region: true,
        district: true,
        amount: true,
        createdAt: true
      }
    }),
    prismaClient.agent.findMany({
      select: {
        id: true,
        agentCode: true,
        fullName: true,
        region: true,
        district: true,
        status: true,
        score: {
          select: {
            trustScore: true,
            defaultRate: true,
            repaymentRate: true,
            activeLoans: true,
            overdueLoans: true
          }
        }
      }
    })
  ]);

  return { loans, repayments, agents };
}

function filterLoans(loans, filters) {
  return loans.filter((loan) => {
    if (!matchesFilter(loan.region, filters.region)) {
      return false;
    }
    if (!matchesFilter(loan.district, filters.district)) {
      return false;
    }
    if (filters.status && normalizeValue(loan.status).toUpperCase() !== filters.status) {
      return false;
    }
    return true;
  });
}

function filterRepayments(repayments, filters) {
  return repayments.filter((repayment) => {
    if (!matchesFilter(repayment.region, filters.region)) {
      return false;
    }
    if (!matchesFilter(repayment.district, filters.district)) {
      return false;
    }
    return true;
  });
}

function filterAgents(agents, filters) {
  return agents.filter((agent) => {
    if (!matchesFilter(agent.region, filters.region)) {
      return false;
    }
    if (!matchesFilter(agent.district, filters.district)) {
      return false;
    }
    return true;
  });
}

function buildTopBarMetrics(loans, repayments, agents) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const totalLoansToday = loans.filter((loan) => {
    const date = new Date(loan.createdAt || loan.disbursedAt || Date.now()).toISOString().slice(0, 10);
    return date === todayKey;
  }).length;
  const activeAgents = agents.filter((agent) => agent.status === "ACTIVE").length;
  const completedOrDefaulted = loans.filter((loan) => ["COMPLETED", "DEFAULTED"].includes(loan.status));
  const defaulted = completedOrDefaulted.filter((loan) => loan.status === "DEFAULTED").length;
  const totalCapitalDeployed = loans.reduce(
    (sum, loan) => sum + asNumber(loan.disbursedAmount || loan.principalAmount || loan.principal),
    0
  );
  const totalRepaid = repayments.reduce((sum, repayment) => sum + asNumber(repayment.amount), 0);
  const averageYield = percentage(
    loans.reduce((sum, loan) => sum + asNumber(loan.processingFee), 0),
    totalCapitalDeployed
  );

  return {
    totalLoansToday,
    totalActiveAgents: activeAgents,
    systemWideDefaultRate: percentage(defaulted, completedOrDefaulted.length),
    totalPortfolioSize: roundMetric(totalCapitalDeployed),
    totalRepaidAmount: roundMetric(totalRepaid),
    averageYield
  };
}

function getAgentColor(score) {
  if (score > 80) {
    return "GREEN";
  }
  if (score >= 50) {
    return "YELLOW";
  }
  return "RED";
}

function getRiskPalette(level) {
  if (level === "HIGH") {
    return "RED";
  }
  if (level === "MEDIUM") {
    return "ORANGE";
  }
  return "GREEN";
}

function getHeatPalette(totalValue, maxValue) {
  if (!maxValue || totalValue <= maxValue * 0.33) {
    return "GREEN";
  }
  if (totalValue <= maxValue * 0.66) {
    return "YELLOW";
  }
  return "RED";
}

function addDeterministicJitter(value, seed, spread = 0.05) {
  const source = Array.from(String(seed || "0")).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const offset = ((source % 100) / 100 - 0.5) * spread;
  return roundMetric(value + offset);
}

async function getGeoHeatmapData(prismaClient, filters = {}) {
  return withCache("heatmap", filters, async () => {
    const { loans, repayments, agents } = await fetchGeoBaseData(prismaClient);
    const filteredLoans = filterLoans(loans, filters);
    const filteredRepayments = filterRepayments(repayments, filters);
    const filteredAgents = filterAgents(agents, filters);
    const grouped = new Map();

    for (const loan of filteredLoans) {
      const meta = getDistrictMeta(loan.region, loan.district);
      if (!meta) {
        continue;
      }

      const key = `${meta.region}::${meta.district}`;
      const bucket = grouped.get(key) || {
        region: meta.region,
        subregion: meta.subregion,
        district: meta.district,
        coordinates: meta.centroid,
        totalLoans: 0,
        totalValue: 0,
        totalRepayable: 0,
        overdueLoans: 0,
        defaultedLoans: 0,
        topAgents: new Map()
      };

      const principal = asNumber(loan.disbursedAmount || loan.principalAmount || loan.principal);
      const repayable = asNumber(loan.totalRepayableAmount || loan.principalAmount || loan.principal);
      bucket.totalLoans += 1;
      bucket.totalValue += principal;
      bucket.totalRepayable += repayable;
      if (loan.status === "DEFAULTED") {
        bucket.defaultedLoans += 1;
      }
      if (asNumber(loan.daysLate) > 0 || loan.status === "DEFAULTED") {
        bucket.overdueLoans += 1;
      }
      if (loan.agentId) {
        bucket.topAgents.set(loan.agentId, (bucket.topAgents.get(loan.agentId) || 0) + principal);
      }

      grouped.set(key, bucket);
    }

    const repaymentsByDistrict = new Map();
    for (const repayment of filteredRepayments) {
      const meta = getDistrictMeta(repayment.region, repayment.district);
      if (!meta) {
        continue;
      }
      const key = `${meta.region}::${meta.district}`;
      repaymentsByDistrict.set(key, (repaymentsByDistrict.get(key) || 0) + asNumber(repayment.amount));
    }

    const agentNames = new Map(filteredAgents.map((agent) => [agent.id, agent.fullName]));
    const rows = Array.from(grouped.values()).map((bucket) => {
      const repaid = repaymentsByDistrict.get(`${bucket.region}::${bucket.district}`) || 0;
      const topAgentEntry = Array.from(bucket.topAgents.entries()).sort((left, right) => right[1] - left[1])[0];
      return {
        region: bucket.region,
        subregion: bucket.subregion,
        district: bucket.district,
        coordinates: bucket.coordinates,
        totalLoans: bucket.totalLoans,
        totalValue: roundMetric(bucket.totalValue),
        totalCapitalDeployed: roundMetric(bucket.totalValue),
        totalRepaid: roundMetric(repaid),
        repaymentRate: percentage(repaid, bucket.totalRepayable),
        defaultRate: percentage(bucket.defaultedLoans, bucket.totalLoans),
        overdueRate: percentage(bucket.overdueLoans, bucket.totalLoans),
        topAgent: topAgentEntry ? agentNames.get(topAgentEntry[0]) || "Unassigned" : "Unassigned"
      };
    });

    const maxValue = rows.reduce((max, row) => Math.max(max, row.totalValue), 0);
    const districts = rows.map((row) => ({
      ...row,
      intensity: row.totalValue,
      heatColor: getHeatPalette(row.totalValue, maxValue)
    }));

    return {
      filters,
      generatedAt: new Date().toISOString(),
      boundaries: {
        regions: DISTRICT_GEOMETRY.regionGeoJson,
        districts: DISTRICT_GEOMETRY.districtGeoJson
      },
      topBar: buildTopBarMetrics(filteredLoans, filteredRepayments, filteredAgents),
      districts
    };
  });
}

async function getGeoAgentOverlay(prismaClient, filters = {}) {
  return withCache("agents", filters, async () => {
    const { loans, agents } = await fetchGeoBaseData(prismaClient);
    const filteredLoans = filterLoans(loans, filters);
    const filteredAgents = filterAgents(agents, filters);
    const loanStats = new Map();

    for (const loan of filteredLoans) {
      if (!loan.agentId) {
        continue;
      }
      const stat = loanStats.get(loan.agentId) || {
        totalLoansHandled: 0,
        totalLoanVolume: 0
      };
      stat.totalLoansHandled += 1;
      stat.totalLoanVolume += asNumber(loan.disbursedAmount || loan.principalAmount || loan.principal);
      loanStats.set(loan.agentId, stat);
    }

    return {
      filters,
      generatedAt: new Date().toISOString(),
      agents: filteredAgents
        .map((agent) => {
          const meta = getDistrictMeta(agent.region, agent.district);
          if (!meta) {
            return null;
          }

          const score = asNumber(agent.score?.trustScore, 0);
          const defaultRate = roundMetric(asNumber(agent.score?.defaultRate, 0));
          const overlayStats = loanStats.get(agent.id) || {
            totalLoansHandled: 0,
            totalLoanVolume: 0
          };

          return {
            id: agent.id,
            agentCode: agent.agentCode,
            agentName: agent.fullName,
            region: agent.region,
            district: agent.district,
            performanceScore: score,
            totalLoansHandled: overlayStats.totalLoansHandled,
            defaultRate,
            activeLoans: asNumber(agent.score?.activeLoans, 0),
            overdueLoans: asNumber(agent.score?.overdueLoans, 0),
            totalLoanVolume: roundMetric(overlayStats.totalLoanVolume),
            markerColor: getAgentColor(score),
            markerSize: Math.max(12, Math.min(32, 12 + overlayStats.totalLoanVolume / 50000)),
            coordinates: {
              lat: addDeterministicJitter(meta.centroid.lat, `${agent.id}-lat`),
              lng: addDeterministicJitter(meta.centroid.lng, `${agent.id}-lng`)
            }
          };
        })
        .filter(Boolean)
    };
  });
}

async function getGeoRiskData(prismaClient, filters = {}) {
  return withCache("risk", filters, async () => {
    const { loans, repayments } = await fetchGeoBaseData(prismaClient);
    const filteredLoans = filterLoans(loans, filters);
    const filteredRepayments = filterRepayments(repayments, filters);
    const grouped = new Map();

    for (const loan of filteredLoans) {
      const meta = getDistrictMeta(loan.region, loan.district);
      if (!meta) {
        continue;
      }

      const key = `${meta.region}::${meta.district}`;
      const bucket = grouped.get(key) || {
        region: meta.region,
        district: meta.district,
        coordinates: meta.centroid,
        totalLoans: 0,
        defaultedLoans: 0,
        overdueLoans: 0,
        totalCapitalDeployed: 0,
        totalRepayable: 0,
        totalProcessingRevenue: 0
      };

      bucket.totalLoans += 1;
      bucket.totalCapitalDeployed += asNumber(loan.disbursedAmount || loan.principalAmount || loan.principal);
      bucket.totalRepayable += asNumber(loan.totalRepayableAmount || loan.principalAmount || loan.principal);
      bucket.totalProcessingRevenue += asNumber(loan.processingFee || 0);
      if (loan.status === "DEFAULTED") {
        bucket.defaultedLoans += 1;
      }
      if (asNumber(loan.daysLate) > 0 || loan.status === "DEFAULTED") {
        bucket.overdueLoans += 1;
      }

      grouped.set(key, bucket);
    }

    const repaymentsByDistrict = new Map();
    for (const repayment of filteredRepayments) {
      const meta = getDistrictMeta(repayment.region, repayment.district);
      if (!meta) {
        continue;
      }
      const key = `${meta.region}::${meta.district}`;
      repaymentsByDistrict.set(key, (repaymentsByDistrict.get(key) || 0) + asNumber(repayment.amount));
    }

    const districts = Array.from(grouped.values()).map((bucket) => {
      const defaultRate = percentage(bucket.defaultedLoans, bucket.totalLoans);
      const overdueRate = percentage(bucket.overdueLoans, bucket.totalLoans);
      const risk = classifyRisk(defaultRate, overdueRate);
      const repaid = repaymentsByDistrict.get(`${bucket.region}::${bucket.district}`) || 0;
      const netYield = percentage(bucket.totalProcessingRevenue, bucket.totalCapitalDeployed);

      return {
        region: bucket.region,
        district: bucket.district,
        coordinates: bucket.coordinates,
        defaultRate,
        overdueRate,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        riskColor: getRiskPalette(risk.riskLevel),
        totalCapitalDeployed: roundMetric(bucket.totalCapitalDeployed),
        totalRepaid: roundMetric(repaid),
        netYield,
        growthTrend: classifyGrowthTrend(repaid, Math.max(bucket.totalCapitalDeployed - repaid, 0)),
        warning: risk.riskLevel === "HIGH" ? "Portfolio stress increasing in this region" : null
      };
    });

    return {
      filters,
      generatedAt: new Date().toISOString(),
      districts
    };
  });
}

module.exports = {
  DISTRICT_GEOMETRY,
  REGION_ORDER,
  buildGeoFilters,
  getGeoAgentOverlay,
  getGeoHeatmapData,
  getGeoRiskData,
  invalidateGeoIntelligenceCache
};
