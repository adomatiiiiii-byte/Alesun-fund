import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { InvestorUgandaMap } from "../components/InvestorUgandaMap";
import { MetricCard } from "../components/MetricCard";
import { useAuth } from "../state/AuthContext";

function formatCurrency(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function aggregateSummary(regions) {
  const totals = regions.reduce((summary, region) => {
    summary.totalPortfolioSize += Number(region.totalCapitalDeployed || 0);
    summary.totalRepaidAmount += Number(region.totalRepaid || 0);
    summary.totalLoanCount += Number(region.loanCount || 0);
    summary.weightedDefaultTotal += Number(region.defaultRate || 0) * Number(region.loanCount || 0);
    summary.weightedYieldValue += Number(region.netYield || 0) * Number(region.totalCapitalDeployed || 0);
    summary.weightedYieldBase += Number(region.totalCapitalDeployed || 0);
    return summary;
  }, {
    totalPortfolioSize: 0,
    totalRepaidAmount: 0,
    totalLoanCount: 0,
    weightedDefaultTotal: 0,
    weightedYieldValue: 0,
    weightedYieldBase: 0
  });

  return {
    totalPortfolioSize: totals.totalPortfolioSize,
    totalRepaidAmount: totals.totalRepaidAmount,
    overallDefaultRate: totals.totalLoanCount ? totals.weightedDefaultTotal / totals.totalLoanCount : 0,
    averageYield: totals.weightedYieldBase ? totals.weightedYieldValue / totals.weightedYieldBase : 0
  };
}

function getRegionNarrative(region) {
  if (region.riskLevel === "HIGH") {
    return "Capital at risk is rising and this region needs closer portfolio attention.";
  }

  if (region.growthTrend === "UP" && region.riskLevel === "LOW") {
    return "Deployment is expanding while repayment quality remains healthy.";
  }

  if (region.agentCoverage === "WEAK") {
    return "Coverage is thin relative to the book, so expansion should stay disciplined.";
  }

  return "Performance is stable with balanced growth, collections, and field coverage.";
}

export function InvestorDashboardPage() {
  const { token } = useAuth();
  const [regions, setRegions] = useState([]);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [error, setError] = useState("");

  const loadGeoSummary = useCallback(async () => {
    try {
      const payload = await api.getInvestorGeoSummary(token);
      setRegions(Array.isArray(payload) ? payload : []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Failed to load investor geo summary");
    }
  }, [token]);

  useEffect(() => {
    loadGeoSummary();
    const intervalId = window.setInterval(loadGeoSummary, 45000);
    return () => window.clearInterval(intervalId);
  }, [loadGeoSummary]);

  useEffect(() => {
    if (!regions.length) {
      setHoveredRegion(null);
      return;
    }

    if (!hoveredRegion || !regions.some((region) => region.region === hoveredRegion.region)) {
      setHoveredRegion(regions[0]);
    }
  }, [hoveredRegion, regions]);

  const summary = useMemo(() => aggregateSummary(regions), [regions]);
  const highRiskRegions = regions.filter((region) => region.riskLevel === "HIGH");

  if (!regions.length && !error) {
    return <p>Loading investor dashboard...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Investor Dashboard</p>
          <h2>Uganda regional capital and portfolio map</h2>
          <p className="headerMeta">A simplified four-region view of capital flow, repayment quality, and portfolio stress.</p>
        </div>
      </section>

      <section className="metricsGrid investorKpiBar">
        <MetricCard label="Total Portfolio Size" value={formatCurrency(summary.totalPortfolioSize)} hint="Capital deployed across Uganda" />
        <MetricCard label="Overall Default Rate" value={formatPercent(summary.overallDefaultRate)} hint="Weighted by active and completed book" />
        <MetricCard label="Total Repaid Amount" value={formatCurrency(summary.totalRepaidAmount)} hint="Collections received to date" />
        <MetricCard label="Average Yield" value={formatPercent(summary.averageYield)} hint="Net yield across the regional portfolio" />
      </section>

      <InvestorUgandaMap
        regions={regions}
        hoveredRegion={hoveredRegion}
        onHover={setHoveredRegion}
        onLeave={() => setHoveredRegion(null)}
      />

      <section className="accountingGrid">
        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Regional Signals</p>
              <h3>Investor intelligence at a glance</h3>
            </div>
          </div>
          <div className="stack compact">
            {regions.map((region) => (
              <div key={region.region} className={`investorRegionCard investorRegionCard-${region.riskLevel.toLowerCase()}`}>
                <div className="sectionHeader">
                  <div>
                    <strong>{region.region}</strong>
                    <p>{getRegionNarrative(region)}</p>
                  </div>
                  <span className={`badge ${region.riskLevel === "HIGH" ? "badge-high-risk" : region.riskLevel === "MEDIUM" ? "badge-warning" : "badge-approved"}`}>
                    {region.riskLevel}
                  </span>
                </div>
                <div className="miniMetricsGrid">
                  <div className="miniMetric">
                    <span>Capital</span>
                    <strong>{formatCurrency(region.totalCapitalDeployed)}</strong>
                  </div>
                  <div className="miniMetric">
                    <span>Repaid</span>
                    <strong>{formatCurrency(region.totalRepaid)}</strong>
                  </div>
                  <div className="miniMetric">
                    <span>Growth</span>
                    <strong>{region.growthTrend}</strong>
                  </div>
                  <div className="miniMetric">
                    <span>Coverage</span>
                    <strong>{region.agentCoverage}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Risk Watch</p>
              <h3>Portfolio stress summary</h3>
            </div>
          </div>
          {highRiskRegions.length ? (
            <div className="stack compact">
              {highRiskRegions.map((region) => (
                <div key={region.region} className="investorRiskCallout">
                  <strong>{region.region}: High Risk Zone</strong>
                  <span>{region.warning || "Portfolio stress increasing in this region"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="goodSegment segmentCard">
              <span>Portfolio signal</span>
              <strong>No region is currently in the high-risk band.</strong>
            </div>
          )}
          <div className="miniMetricsGrid">
            <div className="segmentCard">
              <span>Low-risk regions</span>
              <strong>{regions.filter((region) => region.riskLevel === "LOW").length}</strong>
            </div>
            <div className="segmentCard averageSegment">
              <span>Moderate-risk regions</span>
              <strong>{regions.filter((region) => region.riskLevel === "MEDIUM").length}</strong>
            </div>
            <div className="segmentCard riskySegment">
              <span>High-risk regions</span>
              <strong>{highRiskRegions.length}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
