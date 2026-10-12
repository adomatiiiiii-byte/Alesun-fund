const REGION_SHAPES = {
  Northern: {
    points: "152,58 222,95 250,210 170,248 112,190 120,105",
    labelX: 178,
    labelY: 150
  },
  Western: {
    points: "92,220 150,160 170,248 147,342 95,382 72,300",
    labelX: 120,
    labelY: 276
  },
  Eastern: {
    points: "170,248 250,210 290,282 275,392 220,392 198,314",
    labelX: 242,
    labelY: 300
  },
  Central: {
    points: "147,342 198,314 220,392 192,462 140,432",
    labelX: 178,
    labelY: 392
  }
};

function formatCurrency(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function getRegionTone(region) {
  if (region.riskLevel === "HIGH") {
    return "high";
  }

  if (region.riskLevel === "MEDIUM") {
    return "medium";
  }

  return "low";
}

export function InvestorUgandaMap({ regions, hoveredRegion, onHover, onLeave }) {
  const activeRegion = hoveredRegion || regions[0] || null;

  return (
    <section className="card investorMapCard">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Investor Map</p>
          <h3>Uganda regional portfolio outlook</h3>
        </div>
      </div>

      <div className="investorMapLayout">
        <div className="investorMapFrame">
          <svg viewBox="0 0 360 520" className="investorUgandaSvg" role="img" aria-label="Simplified Uganda regional loan map">
            <path
              d="M152 48 L225 86 L260 172 L290 282 L274 402 L193 478 L136 438 L92 382 L62 298 L90 218 L107 120 Z"
              className="investorMapOutline"
            />
            {regions.map((region) => {
              const shape = REGION_SHAPES[region.region];
              if (!shape) {
                return null;
              }

              const tone = getRegionTone(region);
              const isActive = activeRegion?.region === region.region;
              const isHighRisk = region.riskLevel === "HIGH";

              return (
                <g
                  key={region.region}
                  onMouseEnter={() => onHover(region)}
                  onMouseLeave={onLeave}
                  onFocus={() => onHover(region)}
                  onBlur={onLeave}
                  tabIndex={0}
                  className="investorMapRegionGroup"
                >
                  <polygon
                    points={shape.points}
                    className={`investorMapRegion investorMapRegion-${tone}${isActive ? " active" : ""}${isHighRisk ? " highRisk" : ""}`}
                  />
                  <text x={shape.labelX} y={shape.labelY} textAnchor="middle" className="investorMapLabel">
                    {region.region}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="investorMapTooltip" aria-live="polite">
          {activeRegion ? (
            <>
              <div className="investorMapTooltipHeader">
                <div>
                  <p className="eyebrow">Region Focus</p>
                  <h4>{activeRegion.region}</h4>
                </div>
                <span className={`badge ${activeRegion.riskLevel === "HIGH" ? "badge-high-risk" : activeRegion.riskLevel === "MEDIUM" ? "badge-warning" : "badge-approved"}`}>
                  {activeRegion.riskLevel} risk
                </span>
              </div>
              {activeRegion.riskLevel === "HIGH" ? (
                <div className="investorRiskCallout">
                  <strong>High Risk Zone</strong>
                  <span>{activeRegion.warning || "Portfolio stress increasing in this region"}</span>
                </div>
              ) : null}
              <div className="investorTooltipGrid">
                <div className="miniMetric">
                  <span>Total capital deployed</span>
                  <strong>{formatCurrency(activeRegion.totalCapitalDeployed)}</strong>
                </div>
                <div className="miniMetric">
                  <span>Repayment rate</span>
                  <strong>{formatPercent(activeRegion.repaymentRate)}</strong>
                </div>
                <div className="miniMetric">
                  <span>Default rate</span>
                  <strong>{formatPercent(activeRegion.defaultRate)}</strong>
                </div>
                <div className="miniMetric">
                  <span>Net yield</span>
                  <strong>{formatPercent(activeRegion.netYield)}</strong>
                </div>
              </div>
            </>
          ) : (
            <p>Hover a region to inspect the latest investor summary.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
