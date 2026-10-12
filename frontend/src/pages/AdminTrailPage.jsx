import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("en-GB", { hour12: false });
}

function truncateReason(reason) {
  const text = String(reason || "").trim();
  if (!text) {
    return "No reason captured";
  }
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

function formatCurrency(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

export function AdminTrailPage() {
  const { token } = useAuth();
  const [payload, setPayload] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    adminId: "",
    adminRole: "",
    actionType: "",
    targetId: "",
    startDate: "",
    endDate: "",
    decision: "",
    search: "",
    page: 1,
    pageSize: 20
  });

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      try {
        const response = await api.getAdminAuditTrail(token, filters);
        if (!isCurrent) {
          return;
        }
        setPayload(response);
        setSelectedRecord((current) => {
          if (current) {
            return response.records.find((record) => record.id === current.id) || response.records[0] || null;
          }
          return response.records[0] || null;
        });
        setError("");
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message || "Failed to load admin trail");
        }
      }
    }

    load();
    return () => {
      isCurrent = false;
    };
  }, [filters, token]);

  const admins = payload?.filterOptions?.admins || [];
  const actionTypes = payload?.filterOptions?.actionTypes || [];
  const pagination = payload?.pagination || { page: 1, totalPages: 1, total: 0, pageSize: 20 };

  const selectedSnapshot = useMemo(
    () => JSON.stringify(selectedRecord?.systemSnapshot || {}, null, 2),
    [selectedRecord]
  );

  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Compliance</p>
          <h2>Admin Trail</h2>
          <p className="headerMeta">Bank-grade read-only inspection of admin decisions, overrides, and operational actions.</p>
        </div>
      </section>

      {error ? <p>{error}</p> : null}

      <section className="card">
        <div className="filterGrid">
          <label className="fieldLabel">
            Admin
            <select value={filters.adminId} onChange={(event) => setFilters((current) => ({ ...current, adminId: event.target.value, page: 1 }))}>
              <option value="">All admins</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>{admin.fullName} ({admin.role})</option>
              ))}
            </select>
          </label>
          <label className="fieldLabel">
            Role
            <select value={filters.adminRole} onChange={(event) => setFilters((current) => ({ ...current, adminRole: event.target.value, page: 1 }))}>
              <option value="">All roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="RISK_ADMIN">Risk Admin</option>
              <option value="FINANCE_ADMIN">Finance Admin</option>
            </select>
          </label>
          <label className="fieldLabel">
            Action Type
            <select value={filters.actionType} onChange={(event) => setFilters((current) => ({ ...current, actionType: event.target.value, page: 1 }))}>
              <option value="">All actions</option>
              {actionTypes.map((actionType) => (
                <option key={actionType} value={actionType}>{actionType}</option>
              ))}
            </select>
          </label>
          <label className="fieldLabel">
            Decision
            <select value={filters.decision} onChange={(event) => setFilters((current) => ({ ...current, decision: event.target.value, page: 1 }))}>
              <option value="">All decisions</option>
              <option value="APPROVE">Approve</option>
              <option value="REJECT">Reject</option>
              <option value="OVERRIDE">Override</option>
            </select>
          </label>
          <label className="fieldLabel">
            Start date
            <input type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value, page: 1 }))} />
          </label>
          <label className="fieldLabel">
            End date
            <input type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value, page: 1 }))} />
          </label>
          <label className="fieldLabel">
            Target ID
            <input value={filters.targetId} onChange={(event) => setFilters((current) => ({ ...current, targetId: event.target.value, page: 1 }))} placeholder="loanId or userId" />
          </label>
          <label className="fieldLabel">
            Search
            <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))} placeholder="keywords in reason or snapshot" />
          </label>
        </div>
      </section>

      <section className="geoDashboardShell">
        <section className="card geoMapCard">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Audit Records</p>
              <h3>{pagination.total} total records</h3>
            </div>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin Name</th>
                  <th>Role</th>
                  <th>Action Type</th>
                  <th>Decision</th>
                  <th>Target ID</th>
                  <th>Reason Preview</th>
                </tr>
              </thead>
              <tbody>
                {(payload?.records || []).map((record) => (
                  <tr
                    key={record.id}
                    className={selectedRecord?.id === record.id ? "selectedTableRow" : ""}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td>{formatDateTime(record.createdAt)}</td>
                    <td>{record.adminName}</td>
                    <td>{record.adminRole}</td>
                    <td>{record.actionType}</td>
                    <td>{record.decision || "-"}</td>
                    <td><button type="button" className="tableLinkButton" onClick={() => setSelectedRecord(record)}>{record.targetId}</button></td>
                    <td>{truncateReason(record.reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="buttonRow topGap">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
            >
              Next
            </button>
          </div>
        </section>

        <aside className="card geoSidebar">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Record Detail</p>
              <h3>{selectedRecord?.actionType || "Select a record"}</h3>
            </div>
          </div>
          {!selectedRecord ? (
            <p>Select a row to inspect full reasoning and system context.</p>
          ) : (
            <div className="stack compact">
              <div className="miniMetric"><span>Admin</span><strong>{selectedRecord.adminName}</strong></div>
              <div className="miniMetric"><span>Role</span><strong>{selectedRecord.adminRole}</strong></div>
              <div className="miniMetric"><span>Decision</span><strong>{selectedRecord.decision || "-"}</strong></div>
              <div className="miniMetric"><span>Target</span><strong>{selectedRecord.targetId}</strong></div>
              <div className="miniMetric"><span>Loan amount at time</span><strong>{formatCurrency(selectedRecord.loanAmountAtTime)}</strong></div>
              <div className="miniMetric"><span>Risk score at time</span><strong>{selectedRecord.riskScoreAtTime || 0}</strong></div>
              <div className="miniMetric"><span>IP Address</span><strong>{selectedRecord.ipAddress || "Not captured"}</strong></div>
              <div className="miniMetric"><span>Device</span><strong>{selectedRecord.userAgent || "Not captured"}</strong></div>
              <div className="miniMetric"><span>Timestamp</span><strong>{formatDateTime(selectedRecord.createdAt)}</strong></div>
              <div className="card insetCard">
                <h3>Reason</h3>
                <p>{selectedRecord.reason || "No reason captured for this action."}</p>
              </div>
              <div className="card insetCard">
                <h3>Full system snapshot</h3>
                <pre className="auditSnapshotPre">{selectedSnapshot}</pre>
              </div>
              <div className="buttonRow">
                <Link className="buttonLink" to="/loans">View Related Loan</Link>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
