import { useEffect, useState } from "react";
import { api } from "../api";
import { MetricCard } from "../components/MetricCard";
import { useDashboardRealtime } from "../hooks/useDashboardRealtime";
import { useAuth } from "../state/AuthContext";

export function DashboardPage() {
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    api.getPortfolio(token).then(setPortfolio).catch(console.error);
  }, [refreshTick, token]);

  const { isLive } = useDashboardRealtime({
    token,
    enabled: Boolean(token),
    onPoll: async () => {
      const nextPortfolio = await api.getPortfolio(token);
      setPortfolio(nextPortfolio);
    },
    handlers: {
      loan_request_created: () => setRefreshTick((current) => current + 1),
      loan_status_updated: () => setRefreshTick((current) => current + 1),
      payment_update: () => setRefreshTick((current) => current + 1),
      system_alert: () => setRefreshTick((current) => current + 1)
    }
  });

  if (!portfolio) return <p>Loading dashboard...</p>;

  const geoKpis = portfolio.geoKpis || {
    loansPerRegion: [],
    revenuePerDistrict: [],
    defaultRateByGeography: [],
    agentProductivityRanking: [],
    capitalDeploymentPerRegion: []
  };

  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Portfolio Overview</p>
          <h2>Capital, risk, and repayment visibility</h2>
          <p className="liveStatusText">
            <span className={`liveStatusDot${isLive ? " connected" : ""}`} />
            {isLive ? "Live updates active" : "Live updates reconnecting"}
          </p>
        </div>
      </section>
      <section className="metricsGrid">
        <MetricCard
          label="Total capital deployed"
          value={`UGX ${portfolio.totalCapitalDeployed.toLocaleString()}`}
          hint="Disbursed loan principal"
        />
        <MetricCard label="Active loans" value={portfolio.activeLoans} hint="Open approvals and live facilities" />
        <MetricCard label="Monthly income" value={`UGX ${portfolio.monthlyIncome.toLocaleString()}`} hint="Collected this month" />
        <MetricCard label="Default rate" value={`${portfolio.defaultRate}%`} hint="Share of defaulted loans" />
      </section>
      <section className="splitGrid">
        <article className="card">
          <h3>Risk distribution</h3>
          {Object.entries(portfolio.riskDistribution).map(([key, value]) => (
            <div className="barRow" key={key}>
              <span>{key}</span>
              <div className="barTrack">
                <div className="barFill" style={{ width: `${Math.max(8, value * 18)}px` }} />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </article>
        <article className="card">
          <h3>Operational rules</h3>
          <ul className="plainList">
            <li>No loan can be approved without a risk score.</li>
            <li>Every critical action is written to the audit log.</li>
            <li>Installments overdue by more than 7 days switch into warning state.</li>
          </ul>
        </article>
      </section>
      <section className="splitGrid">
        <article className="card">
          <h3>Loans per region</h3>
          {(geoKpis.loansPerRegion || []).map((row) => (
            <div className="barRow" key={row.region}>
              <span>{row.region}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </article>
        <article className="card">
          <h3>Capital deployment per region</h3>
          {(geoKpis.capitalDeploymentPerRegion || []).map((row) => (
            <div className="barRow" key={row.region}>
              <span>{row.region}</span>
              <strong>{`UGX ${Number(row.totalValue || 0).toLocaleString()}`}</strong>
            </div>
          ))}
        </article>
      </section>
      <section className="splitGrid">
        <article className="card">
          <h3>Revenue per district</h3>
          {(geoKpis.revenuePerDistrict || []).slice(0, 8).map((row) => (
            <div className="barRow" key={row.district}>
              <span>{row.district}</span>
              <strong>{`UGX ${Number(row.amount || 0).toLocaleString()}`}</strong>
            </div>
          ))}
        </article>
        <article className="card">
          <h3>Agent productivity ranking</h3>
          {(geoKpis.agentProductivityRanking || []).map((row) => (
            <div className="barRow" key={row.id}>
              <span>{row.name}</span>
              <strong>{row.trustScore}</strong>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
