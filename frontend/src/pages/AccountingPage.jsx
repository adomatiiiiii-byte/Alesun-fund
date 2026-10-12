import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { MetricCard } from "../components/MetricCard";
import { useDashboardRealtime } from "../hooks/useDashboardRealtime";
import { useAuth } from "../state/AuthContext";

function formatCurrency(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatDateTime(value) {
  if (!value) {
    return "Not yet recorded";
  }

  return new Date(value).toLocaleString();
}

function TrendBars({ rows, valueKey, colorClass }) {
  const maxValue = useMemo(
    () => Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1),
    [rows, valueKey]
  );

  return (
    <div className="trendBars">
      {rows.map((row) => {
        const width = `${Math.max(6, (Number(row[valueKey] || 0) / maxValue) * 100)}%`;
        return (
          <div className="trendRow" key={`${valueKey}-${row.period}`}>
            <div className="trendMeta">
              <strong>{row.period}</strong>
              <span>
                {valueKey === "portfolioValue"
                  ? formatCurrency(row[valueKey])
                  : `${row[valueKey]} loans`}
              </span>
            </div>
            <div className="trendTrack">
              <div className={`trendFill ${colorClass}`} style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AccountingPage() {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;
    setOverview(null);
    setError("");

    api.getAccountingOverview(token)
      .then((data) => {
        if (active) {
          setOverview(data);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || "Failed to load accounting overview");
        }
      });

    return () => {
      active = false;
    };
  }, [refreshTick, token]);

  const { isLive } = useDashboardRealtime({
    token,
    enabled: Boolean(token),
    onPoll: async () => {
      const nextOverview = await api.getAccountingOverview(token);
      setOverview(nextOverview);
      setError("");
    },
    handlers: {
      loan_request_created: () => setRefreshTick((current) => current + 1),
      loan_status_updated: () => setRefreshTick((current) => current + 1),
      payment_update: () => setRefreshTick((current) => current + 1),
      system_alert: () => setRefreshTick((current) => current + 1)
    }
  });

  if (!overview && !error) {
    return <p>Loading accounting dashboard...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="stack accountingPage">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Accounting</p>
          <h2>Financial clarity, risk visibility, and lending control</h2>
          <p className="headerMeta">
            Track cash, collections, portfolio health, and borrower quality from one view.
          </p>
          <p className="liveStatusText">
            <span className={`liveStatusDot${isLive ? " connected" : ""}`} />
            {isLive ? "Live updates active" : "Live updates reconnecting"}
          </p>
        </div>
      </section>

      <section className="metricsGrid">
        <MetricCard
          label="Total Portfolio Value"
          value={formatCurrency(overview.summary.totalPortfolioValue)}
          hint="Active loan principal on book"
        />
        <MetricCard
          label="Active Loans Count"
          value={overview.summary.activeLoansCount}
          hint="Currently live facilities"
        />
        <MetricCard
          label="Cash Available"
          value={formatCurrency(overview.summary.cashAvailable)}
          hint="Net cash position from lending flows"
        />
        <MetricCard
          label="Default Rate"
          value={formatPercent(overview.summary.defaultRate)}
          hint="Share of defaulted loans"
        />
      </section>

      <section className="accountingGrid">
        <article className="card accountingSection riskCard">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">System Health</p>
              <h3>Real-time monitoring and anomaly alerts</h3>
            </div>
            <strong className="highlightValue">{overview.systemHealth.lastStatus}</strong>
          </div>
          <div className="miniMetricsGrid">
            <div className="miniMetric criticalMetric">
              <span>Active alerts</span>
              <strong>{overview.systemHealth.activeAlerts}</strong>
            </div>
            <div className="miniMetric criticalMetric">
              <span>Critical alerts</span>
              <strong>{overview.systemHealth.criticalAlerts}</strong>
            </div>
            <div className="miniMetric">
              <span>Warning alerts</span>
              <strong>{overview.systemHealth.warningAlerts}</strong>
            </div>
            <div className="miniMetric">
              <span>API error rate</span>
              <strong>{formatPercent(overview.systemHealth.apiHealth.errorRate)}</strong>
            </div>
          </div>
          <div className="accountingLedger topGap">
            <div className="ledgerRow">
              <span>Last alert time</span>
              <strong>{formatDateTime(overview.systemHealth.lastRunTime)}</strong>
            </div>
            <div className="ledgerRow">
              <span>Last reconciliation</span>
              <strong>{overview.systemHealth.reconciliation.lastStatus}</strong>
            </div>
            <div className="ledgerRow">
              <span>Reconciliation errors</span>
              <strong>{overview.systemHealth.reconciliation.totalErrors}</strong>
            </div>
            <div className="ledgerRow">
              <span>Reconciliation run time</span>
              <strong>{formatDateTime(overview.systemHealth.reconciliation.lastRunTime)}</strong>
            </div>
            <div className="ledgerRow">
              <span>Requests tracked (last minute)</span>
              <strong>{overview.systemHealth.apiHealth.requestCount}</strong>
            </div>
            <div className="ledgerRow">
              <span>Server errors (last minute)</span>
              <strong>{overview.systemHealth.apiHealth.errorCount}</strong>
            </div>
          </div>
        </article>

        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">System Alerts</p>
              <h3>Active issues requiring review</h3>
            </div>
          </div>
          <div className="stack compact topGap">
            {(overview.systemHealth.alerts || []).length ? (
              overview.systemHealth.alerts.map((alert) => (
                <div key={alert.id} className="messageCard">
                  <div className="ledgerRow">
                    <strong>{alert.type}</strong>
                    <span>{alert.severity}</span>
                  </div>
                  <p>{alert.message}</p>
                  <span>{formatDateTime(alert.createdAt)}</span>
                </div>
              ))
            ) : (
              <p>No active system alerts.</p>
            )}
          </div>
        </article>
      </section>

      <section className="accountingGrid">
        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Cash Flow</p>
              <h3>Inflows and outflows</h3>
            </div>
            <strong className="highlightValue">
              {formatCurrency(overview.cashFlow.netCashFlow)}
            </strong>
          </div>
          <div className="accountingLedger">
            <div className="ledgerGroup">
              <h4>Inflows</h4>
              <div className="ledgerRow">
                <span>Loan repayments received</span>
                <strong>{formatCurrency(overview.cashFlow.inflows.loanRepaymentsReceived)}</strong>
              </div>
              <div className="ledgerRow">
                <span>Interest income</span>
                <strong>{formatCurrency(overview.cashFlow.inflows.interestIncome)}</strong>
              </div>
              <div className="ledgerRow">
                <span>Total inflows</span>
                <strong>{formatCurrency(overview.cashFlow.inflows.totalInflows)}</strong>
              </div>
            </div>
            <div className="ledgerGroup">
              <h4>Outflows</h4>
              <div className="ledgerRow">
                <span>Loan disbursements</span>
                <strong>{formatCurrency(overview.cashFlow.outflows.loanDisbursements)}</strong>
              </div>
              <div className="ledgerRow ledgerTotal">
                <span>Net cash flow</span>
                <strong>{formatCurrency(overview.cashFlow.netCashFlow)}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Income Statement</p>
              <h3>Revenue and profit</h3>
            </div>
            <strong className="highlightValue">
              {formatCurrency(overview.incomeStatement.netProfit)}
            </strong>
          </div>
          <div className="accountingLedger">
            <div className="ledgerGroup">
              <h4>Revenue</h4>
              <div className="ledgerRow">
                <span>Interest earned</span>
                <strong>{formatCurrency(overview.incomeStatement.revenue.interestEarned)}</strong>
              </div>
            </div>
            <div className="ledgerGroup">
              <h4>Expenses</h4>
              <div className="ledgerRow">
                <span>Operational costs</span>
                <strong>{formatCurrency(overview.incomeStatement.expenses.operationalCosts)}</strong>
              </div>
              <div className="ledgerRow ledgerTotal">
                <span>Net profit</span>
                <strong>{formatCurrency(overview.incomeStatement.netProfit)}</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="accountingGrid">
        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Balance Sheet</p>
              <h3>Assets and liabilities</h3>
            </div>
          </div>
          <div className="accountingLedger">
            <div className="ledgerGroup">
              <h4>Assets</h4>
              <div className="ledgerRow">
                <span>Total loans outstanding</span>
                <strong>{formatCurrency(overview.balanceSheet.assets.totalLoansOutstanding)}</strong>
              </div>
              <div className="ledgerRow">
                <span>Cash available</span>
                <strong>{formatCurrency(overview.balanceSheet.assets.cashAvailable)}</strong>
              </div>
            </div>
            <div className="ledgerGroup">
              <h4>Liabilities</h4>
              <div className="ledgerRow">
                <span>External funding</span>
                <strong>{formatCurrency(overview.balanceSheet.liabilities.externalFunding)}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Portfolio Overview</p>
              <h3>Loan book activity</h3>
            </div>
          </div>
          <div className="miniMetricsGrid">
            <div className="miniMetric">
              <span>Total loans issued</span>
              <strong>{overview.portfolio.totalLoansIssued}</strong>
            </div>
            <div className="miniMetric">
              <span>Active loans</span>
              <strong>{overview.portfolio.activeLoans}</strong>
            </div>
            <div className="miniMetric">
              <span>Completed loans</span>
              <strong>{overview.portfolio.completedLoans}</strong>
            </div>
            <div className="miniMetric">
              <span>Defaulted loans</span>
              <strong>{overview.portfolio.defaultedLoans}</strong>
            </div>
            <div className="miniMetric">
              <span>Pending loan requests</span>
              <strong>{overview.summary.pendingLoanRequests}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="accountingGrid">
        <article className="card accountingSection riskCard">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Risk Metrics</p>
              <h3>Delinquency and defaults</h3>
            </div>
          </div>
          <div className="miniMetricsGrid">
            <div className="miniMetric criticalMetric">
              <span>Default rate</span>
              <strong>{formatPercent(overview.riskMetrics.defaultRate)}</strong>
            </div>
            <div className="miniMetric criticalMetric">
              <span>Late payment rate</span>
              <strong>{formatPercent(overview.riskMetrics.latePaymentRate)}</strong>
            </div>
            <div className="miniMetric criticalMetric">
              <span>Total overdue amount</span>
              <strong>{formatCurrency(overview.riskMetrics.totalOverdueAmount)}</strong>
            </div>
            <div className="miniMetric">
              <span>Average days late</span>
              <strong>{overview.riskMetrics.averageDaysLate}</strong>
            </div>
          </div>
        </article>

        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Collections</p>
              <h3>Repayment performance</h3>
            </div>
            <strong className="highlightValue">
              {formatPercent(overview.collections.collectionEfficiency)}
            </strong>
          </div>
          <div className="accountingLedger">
            <div className="ledgerRow">
              <span>Expected repayments</span>
              <strong>{formatCurrency(overview.collections.expectedRepayments)}</strong>
            </div>
            <div className="ledgerRow">
              <span>Actual collected amount</span>
              <strong>{formatCurrency(overview.collections.actualCollectedAmount)}</strong>
            </div>
            <div className="ledgerRow ledgerTotal">
              <span>Collection efficiency</span>
              <strong>{formatPercent(overview.collections.collectionEfficiency)}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="accountingGrid">
        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Loan Growth</p>
              <h3>Issued loans over time</h3>
            </div>
          </div>
          <TrendBars rows={overview.growth} valueKey="loansIssued" colorClass="tealFill" />
        </article>

        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Portfolio Trend</p>
              <h3>Portfolio growth curve</h3>
            </div>
          </div>
          <TrendBars rows={overview.growth} valueKey="portfolioValue" colorClass="goldFill" />
        </article>
      </section>

      <section className="accountingGrid">
        <article className="card accountingSection">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">User Segments</p>
              <h3>Borrower quality bands</h3>
            </div>
          </div>
          <div className="segmentGrid">
            <div className="segmentCard goodSegment">
              <span>Good</span>
              <strong>{overview.userSegments.good}</strong>
              <small>Score 80 and above</small>
            </div>
            <div className="segmentCard averageSegment">
              <span>Average</span>
              <strong>{overview.userSegments.average}</strong>
              <small>Score 60 to 79</small>
            </div>
            <div className="segmentCard riskySegment">
              <span>Risky</span>
              <strong>{overview.userSegments.risky}</strong>
              <small>Score below 60</small>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
