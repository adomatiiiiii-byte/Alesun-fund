import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";

function formatCurrency(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

export function AgentDashboardPage() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== "AGENT") {
      setIsLoading(false);
      return;
    }

    Promise.all([api.getAgentStatus(token), api.getAgentDashboard(token)])
      .then(([statusData, dashboardData]) => {
        setStatus(statusData);
        setDashboard(dashboardData);
        setMessage(statusData.message || "");
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [token, user?.role]);

  async function handleWithdraw() {
    try {
      const response = await api.withdrawAgentFunds(token, { amount: Number(withdrawAmount || 0) });
      const nextDashboard = await api.getAgentDashboard(token);
      setDashboard(nextDashboard);
      setWithdrawAmount("");
      setMessage(response.message || "Withdrawal processed successfully.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!token || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== "AGENT") {
    return <Navigate to={user.dashboardPath || "/admin/login"} replace />;
  }

  return (
    <div className="stack">
      <div className="card insetCard">
        <p className="eyebrow">Agent network</p>
        <h2>Agent Dashboard</h2>
        <p>Monitor only the borrowers, loans, wallet activity, and alerts assigned to your agent account.</p>
      </div>

      {isLoading ? (
        <div className="card insetCard">
          <p>Loading agent dashboard...</p>
        </div>
      ) : !dashboard || status?.status !== "APPROVED" ? (
        <div className="card insetCard stack compact">
          <p>{message || "Your agent account is not active yet."}</p>
        </div>
      ) : (
        <>
          {message ? (
            <div className="card insetCard">
              <p className="infoText">{message}</p>
            </div>
          ) : null}

          <div className="metricsGrid borrowerSummaryGrid">
            <article className="metricCard borrowerMetric"><span>Total users referred</span><strong>{dashboard.overview.totalUsersReferred}</strong></article>
            <article className="metricCard borrowerMetric"><span>Active loans</span><strong>{dashboard.overview.activeLoans}</strong></article>
            <article className="metricCard borrowerMetric"><span>Overdue loans</span><strong>{dashboard.overview.overdueLoans}</strong></article>
            <article className="metricCard borrowerMetric"><span>Total earnings</span><strong>{formatCurrency(dashboard.overview.totalEarnings)}</strong></article>
            <article className="metricCard borrowerMetric"><span>Pending balance</span><strong>{formatCurrency(dashboard.overview.pendingBalance)}</strong></article>
            <article className="metricCard borrowerMetric"><span>Available balance</span><strong>{formatCurrency(dashboard.overview.availableBalance)}</strong></article>
            <article className="metricCard borrowerMetric"><span>Trust score</span><strong>{dashboard.overview.trustScore}</strong></article>
          </div>

          <div className="workflowSplit">
            <div className="card insetCard">
              <h3>Assigned Users</h3>
              {!dashboard.users.length ? (
                <p className="infoText">No assigned users yet.</p>
              ) : (
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Loan Status</th>
                        <th>Repayment Progress</th>
                        <th>Next Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.users.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.name}</td>
                          <td>{entry.phone}</td>
                          <td>{entry.loanStatus}</td>
                          <td>{entry.repaymentProgress}%</td>
                          <td>{entry.nextDueDate ? new Date(entry.nextDueDate).toLocaleDateString("en-GB") : "Not available"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card insetCard">
              <h3>Alerts</h3>
              {!dashboard.alerts.length ? (
                <p className="infoText">No alerts right now.</p>
              ) : (
                <div className="stack compact">
                  {dashboard.alerts.map((alert) => (
                    <p key={alert.id} className="infoText">{alert.message}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="workflowSplit">
            <div className="card insetCard">
              <h3>Earnings</h3>
              {!dashboard.earnings.length ? (
                <p className="infoText">No earnings recorded yet.</p>
              ) : (
                <div className="stack compact">
                  {dashboard.earnings.map((entry) => (
                    <div key={entry.id} className="messageCard">
                      <div className="barRow">
                        <strong>{entry.type.replaceAll("_", " ")}</strong>
                        <span>{new Date(entry.createdAt).toLocaleDateString("en-GB")}</span>
                      </div>
                      <p>{formatCurrency(entry.amount)} • {entry.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card insetCard">
              <h3>Withdraw Funds</h3>
              <p>Available balance: {formatCurrency(dashboard.overview.availableBalance)}</p>
              <div className="buttonRow topGap">
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                />
                <button
                  type="button"
                  disabled={!Number(withdrawAmount || 0) || Number(withdrawAmount || 0) > Number(dashboard.overview.availableBalance || 0)}
                  onClick={handleWithdraw}
                >
                  Withdraw Funds
                </button>
              </div>
            </div>
          </div>

          <div className="card insetCard">
            <h3>Profile Snapshot</h3>
            <p><strong>Agent code:</strong> {dashboard.overview.agentCode}</p>
            <p><strong>Created by:</strong> {dashboard.overview.createdBy}</p>
            <p><strong>Region:</strong> {dashboard.overview.region}</p>
            <p><strong>District:</strong> {dashboard.overview.district}</p>
            <p><strong>Subcounty:</strong> {dashboard.overview.subcounty}</p>
            <div className="buttonRow">
              <Link className="buttonLink" to="/admin/login">
                Back to login
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
