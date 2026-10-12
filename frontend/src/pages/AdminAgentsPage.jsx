import { useEffect, useState } from "react";
import { api } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../state/AuthContext";

function formatCurrency(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

const emptyCreateForm = {
  fullName: "",
  phoneNumber: "",
  nationalId: "",
  address: "",
  notes: "",
  country: "Uganda",
  region: "",
  subregion: "",
  district: "",
  administrativeUnit: "",
  subUnit: "",
  subcounty: ""
};

export function AdminAgentsPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState({
    pendingApplications: [],
    approvedAgents: [],
    adminAccountability: [],
    geoView: null
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [filters, setFilters] = useState({ country: "", region: "", subregion: "", district: "", administrativeUnit: "", subUnit: "", subcounty: "", agentId: "" });
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [passwordResetForm, setPasswordResetForm] = useState({ newTemporaryPassword: "", reason: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api.getAdminAgents(token, filters);
    setSummary(data);
    if (!selectedAgent && data.approvedAgents[0]) {
      setSelectedAgent(data.approvedAgents[0]);
    }
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [token, filters.country, filters.region, filters.subregion, filters.district, filters.administrativeUnit, filters.subUnit, filters.subcounty, filters.agentId]);

  useEffect(() => {
    if (!selectedAgent?.id) {
      setSelectedDetail(null);
      return;
    }

    api.getAdminAgentDetail(token, selectedAgent.id)
      .then((data) => setSelectedDetail(data.detail))
      .catch((error) => setMessage(error.message));
  }, [selectedAgent?.id, token]);

  useEffect(() => {
    setPasswordResetForm({ newTemporaryPassword: "", reason: "" });
  }, [selectedAgent?.id]);

  async function handleCreateAgent(event) {
    event.preventDefault();
    try {
      const response = await api.createAdminAgent(token, {
        fullName: createForm.fullName,
        phoneNumber: createForm.phoneNumber,
        nationalId: createForm.nationalId,
        kycDetails: {
          address: createForm.address,
          notes: createForm.notes
        },
        geography: {
          country: createForm.country,
          region: createForm.region,
          subregion: createForm.subregion,
          district: createForm.district,
          administrativeUnit: createForm.administrativeUnit,
          subUnit: createForm.subUnit,
          subcounty: createForm.subcounty || createForm.subUnit
        }
      });

      setCreatedCredentials(response.credentials || null);
      setMessage(`Agent ${response.agent.fullName} created successfully.`);
      setCreateForm(emptyCreateForm);
      await load();
      setSelectedAgent(response.agent);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleAgentStatus(agentId, status) {
    try {
      await api.updateAdminAgentStatus(token, agentId, { status });
      setMessage(status === "SUSPENDED" ? "Agent suspended." : "Agent reactivated.");
      await load();
      const detail = await api.getAdminAgentDetail(token, agentId);
      setSelectedDetail(detail.detail);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    if (!selectedDetail?.id) {
      return;
    }

    try {
      const response = await api.manualPasswordReset(token, {
        accountType: "AGENT",
        accountId: selectedDetail.id,
        newTemporaryPassword: passwordResetForm.newTemporaryPassword,
        reason: passwordResetForm.reason
      });
      setMessage(response.message);
      setPasswordResetForm({ newTemporaryPassword: "", reason: "" });
    } catch (error) {
      setMessage(error.message);
    }
  }

  const geoCatalog = summary.geoView?.filterOptions?.geoCatalog || [];
  const selectedRegion = geoCatalog.find((entry) => entry.region === createForm.region) || null;
  const createSubregions = selectedRegion?.subregions || [];
  const selectedSubregion = createSubregions.find((entry) => entry.subregion === createForm.subregion) || null;
  const createDistricts = selectedSubregion?.districts || [];
  const selectedDistrict = createDistricts.find((entry) => entry.district === createForm.district) || null;
  const createAdministrativeUnits = selectedDistrict?.administrativeUnits || [];
  const selectedAdministrativeUnit = createAdministrativeUnits.find((entry) => entry.name === createForm.administrativeUnit) || null;
  const createSubUnits = selectedAdministrativeUnit?.subUnits || [];
  const createNeedsManualAdministrativeUnit = Boolean(selectedDistrict && createAdministrativeUnits.length === 0);
  const createNeedsManualSubUnit = Boolean(selectedAdministrativeUnit && createSubUnits.length === 0);
  const filterRegion = geoCatalog.find((entry) => entry.region === filters.region) || null;
  const filterSubregions = filterRegion?.subregions || [];
  const filterSubregion = filterSubregions.find((entry) => entry.subregion === filters.subregion) || null;
  const filterDistricts = filterSubregion?.districts || [];
  const filterDistrict = filterDistricts.find((entry) => entry.district === filters.district) || null;
  const filterAdministrativeUnits = filterDistrict?.administrativeUnits || [];

  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Agent Management</p>
          <h2>Agents</h2>
        </div>
      </section>
      {message ? <p className="infoText">{message}</p> : null}

      <section className="card">
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Create Agent</p>
            <h3>Admin-controlled onboarding</h3>
          </div>
        </div>
        <form className="formGrid topGap" onSubmit={handleCreateAgent}>
          <input placeholder="Full name" value={createForm.fullName} onChange={(event) => setCreateForm({ ...createForm, fullName: event.target.value })} />
          <input placeholder="Phone number" value={createForm.phoneNumber} onChange={(event) => setCreateForm({ ...createForm, phoneNumber: event.target.value })} />
          <input placeholder="National ID" value={createForm.nationalId} onChange={(event) => setCreateForm({ ...createForm, nationalId: event.target.value })} />
          <input placeholder="KYC address" value={createForm.address} onChange={(event) => setCreateForm({ ...createForm, address: event.target.value })} />
          <textarea placeholder="KYC details / notes" value={createForm.notes} onChange={(event) => setCreateForm({ ...createForm, notes: event.target.value })} />
          <div className="filterGrid">
            <input value={createForm.country} onChange={(event) => setCreateForm({ ...createForm, country: event.target.value })} placeholder="Country" />
            <select value={createForm.region} onChange={(event) => setCreateForm({ ...createForm, region: event.target.value, subregion: "", district: "", administrativeUnit: "", subUnit: "", subcounty: "" })}>
              <option value="">Select region</option>
              {geoCatalog.map((entry) => (
                <option key={entry.region} value={entry.region}>{entry.region}</option>
              ))}
            </select>
            <select value={createForm.subregion} onChange={(event) => setCreateForm({ ...createForm, subregion: event.target.value, district: "", administrativeUnit: "", subUnit: "", subcounty: "" })}>
              <option value="">Select subregion</option>
              {createSubregions.map((entry) => (
                <option key={entry.subregion} value={entry.subregion}>{entry.subregion}</option>
              ))}
            </select>
            <select value={createForm.district} onChange={(event) => setCreateForm({ ...createForm, district: event.target.value, administrativeUnit: "", subUnit: "", subcounty: "" })}>
              <option value="">Select district/city</option>
              {createDistricts.map((entry) => (
                <option key={entry.district} value={entry.district}>{entry.district}</option>
              ))}
            </select>
            {createNeedsManualAdministrativeUnit ? (
              <input placeholder="Administrative unit" value={createForm.administrativeUnit} onChange={(event) => setCreateForm({ ...createForm, administrativeUnit: event.target.value })} />
            ) : (
              <select value={createForm.administrativeUnit} onChange={(event) => setCreateForm({ ...createForm, administrativeUnit: event.target.value, subUnit: "", subcounty: "" })}>
                <option value="">Select administrative unit</option>
                {createAdministrativeUnits.map((entry) => (
                  <option key={entry.name} value={entry.name}>{entry.name}</option>
                ))}
              </select>
            )}
            {createNeedsManualAdministrativeUnit || createNeedsManualSubUnit ? (
              <input
                placeholder="Sub unit"
                value={createForm.subUnit}
                onChange={(event) => setCreateForm({ ...createForm, subUnit: event.target.value, subcounty: event.target.value })}
              />
            ) : (
              <select value={createForm.subUnit} onChange={(event) => setCreateForm({ ...createForm, subUnit: event.target.value, subcounty: event.target.value })}>
                <option value="">Select sub unit</option>
                {createSubUnits.map((entry) => (
                  <option key={entry.name} value={entry.name}>{entry.name}</option>
                ))}
              </select>
            )}
          </div>
          {createNeedsManualAdministrativeUnit ? <p className="infoText">Administrative unit list not yet available for this district. Please enter manually.</p> : null}
          {createNeedsManualAdministrativeUnit || createNeedsManualSubUnit ? <p className="infoText">Sub unit list not yet available for this administrative unit. Please enter manually.</p> : null}
          <div className="buttonRow">
            <button type="submit">Create agent</button>
          </div>
        </form>
        {createdCredentials ? (
          <div className="card insetCard topGap">
            <h3>One-time login credentials</h3>
            <p><strong>Login email:</strong> {createdCredentials.email}</p>
            <p><strong>Temporary password:</strong> {createdCredentials.temporaryPassword}</p>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Geo View</p>
            <h3>Regional agent analytics</h3>
          </div>
        </div>
        <div className="filterGrid topGap">
          <label className="fieldLabel">
            Country
            <input value={filters.country || ""} onChange={(event) => setFilters({ ...filters, country: event.target.value, region: "", subregion: "", district: "", administrativeUnit: "", subUnit: "", subcounty: "", agentId: "" })} placeholder="All countries" />
          </label>
          <label className="fieldLabel">
            Region
            <select value={filters.region} onChange={(event) => setFilters({ ...filters, region: event.target.value, subregion: "", district: "", administrativeUnit: "", subUnit: "", subcounty: "", agentId: "" })}>
              <option value="">All regions</option>
              {geoCatalog.map((entry) => (
                <option key={entry.region} value={entry.region}>{entry.region}</option>
              ))}
            </select>
          </label>
          <label className="fieldLabel">
            Subregion
            <select value={filters.subregion || ""} onChange={(event) => setFilters({ ...filters, subregion: event.target.value, district: "", administrativeUnit: "", subUnit: "", subcounty: "", agentId: "" })}>
              <option value="">All subregions</option>
              {filterSubregions.map((entry) => (
                <option key={entry.subregion} value={entry.subregion}>{entry.subregion}</option>
              ))}
            </select>
          </label>
          <label className="fieldLabel">
            District / City
            <select value={filters.district} onChange={(event) => setFilters({ ...filters, district: event.target.value, administrativeUnit: "", subUnit: "", subcounty: "", agentId: "" })}>
              <option value="">All districts</option>
              {filterDistricts.map((entry) => (
                <option key={entry.district} value={entry.district}>{entry.district}</option>
              ))}
            </select>
          </label>
          <label className="fieldLabel">
            Administrative Unit
            <select value={filters.administrativeUnit || ""} onChange={(event) => setFilters({ ...filters, administrativeUnit: event.target.value, subUnit: "", subcounty: "", agentId: "" })}>
              <option value="">All administrative units</option>
              {filterAdministrativeUnits.map((entry) => (
                <option key={entry.name} value={entry.name}>{entry.name}</option>
              ))}
            </select>
          </label>
          <label className="fieldLabel">
            Sub Unit
            <input value={filters.subUnit || ""} onChange={(event) => setFilters({ ...filters, subUnit: event.target.value, subcounty: event.target.value, agentId: "" })} placeholder="All sub units" />
          </label>
          <label className="fieldLabel">
            Agent
            <select value={filters.agentId} onChange={(event) => setFilters({ ...filters, agentId: event.target.value })}>
              <option value="">All agents</option>
              {(summary.geoView?.filterOptions?.agents || []).map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name} ({agent.agentCode})</option>
              ))}
            </select>
          </label>
        </div>
        {summary.geoView ? (
          <div className="workflowSplit topGap">
            <div className="card insetCard">
              <h3>Agents per region</h3>
              <div className="stack compact">
                {summary.geoView.agentsPerRegion.map((row) => (
                  <div key={row.region} className="ledgerRow">
                    <span>{row.region}</span>
                    <strong>{row.count}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="card insetCard">
              <h3>Loan distribution</h3>
              <div className="stack compact">
                {summary.geoView.loanDistribution.map((row) => (
                  <div key={row.region} className="ledgerRow">
                    <span>{row.region}</span>
                    <strong>{row.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {summary.geoView ? (
          <div className="workflowSplit topGap">
            <div className="card insetCard">
              <h3>Default rates per district</h3>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                     <th>District</th>
                      <th>Subregion</th>
                      <th>Region</th>
                      <th>Loans</th>
                      <th>Default rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.geoView.districtPerformance.map((row) => (
                      <tr key={row.district}>
                        <td>{row.district}</td>
                        <td>{row.subregion || "Not set"}</td>
                        <td>{row.region}</td>
                        <td>{row.loanCount}</td>
                        <td>{row.defaultRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card insetCard">
              <h3>Agent performance heatmap</h3>
              <div className="stack compact">
                {summary.geoView.heatmap.map((row) => (
                  <div key={row.id} className="messageCard">
                    <div className="ledgerRow">
                      <strong>{row.name}</strong>
                      <span>{[row.region, row.subregion, row.district].filter(Boolean).join(" / ")}</span>
                    </div>
                    <p>Trust score: {row.trustScore} • Default rate: {row.defaultRate}% • Active loans: {row.activeLoans}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {summary.geoView ? (
          <div className="workflowSplit topGap">
            <div className="card insetCard">
              <h3>Users by district</h3>
              <div className="stack compact">
                {summary.geoView.usersByDistrict.map((row) => (
                  <div key={row.district} className="ledgerRow">
                    <span>{row.district}</span>
                    <strong>{row.count}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="card insetCard">
              <h3>Users by administrative unit</h3>
              <div className="stack compact">
                {summary.geoView.usersByAdministrativeUnit.map((row) => (
                  <div key={row.administrativeUnit} className="ledgerRow">
                    <span>{row.administrativeUnit}</span>
                    <strong>{row.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {summary.geoView ? (
          <div className="workflowSplit topGap">
            <div className="card insetCard">
              <h3>Loans by sub unit</h3>
              <div className="stack compact">
                {summary.geoView.loansBySubUnit.map((row) => (
                  <div key={row.subUnit} className="ledgerRow">
                    <span>{row.subUnit}</span>
                    <strong>{row.count}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="card insetCard">
              <h3>Repayments by district</h3>
              <div className="stack compact">
                {summary.geoView.repaymentsByDistrict.map((row) => (
                  <div key={row.district} className="ledgerRow">
                    <span>{row.district}</span>
                    <strong>{formatCurrency(row.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {summary.geoView ? (
          <div className="workflowSplit topGap">
            <div className="card insetCard">
              <h3>Agent performance by administrative unit</h3>
              <div className="stack compact">
                {summary.geoView.agentPerformanceByAdministrativeUnit.map((row) => (
                  <div key={row.administrativeUnit} className="messageCard">
                    <strong>{row.administrativeUnit}</strong>
                    <p>Active: {row.activeLoans} • Completed: {row.completedLoans} • Defaulted: {row.defaultedLoans}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="card insetCard">
              <h3>Defaults by sub unit</h3>
              <div className="stack compact">
                {summary.geoView.defaultsBySubUnit.map((row) => (
                  <div key={row.subUnit} className="ledgerRow">
                    <span>{row.subUnit}</span>
                    <strong>{row.defaultRate}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Admin accountability</p>
            <h3>Agent network performance by admin</h3>
          </div>
        </div>
        {!summary.adminAccountability?.length ? (
          <p className="infoText topGap">No admin-agent accountability records yet.</p>
        ) : (
          <div className="tableWrap topGap">
            <table>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Agents Created</th>
                  <th>Average Default Rate</th>
                  <th>Average Trust Score</th>
                </tr>
              </thead>
              <tbody>
                {summary.adminAccountability.map((entry) => (
                  <tr key={entry.adminId}>
                    <td>{entry.adminName}</td>
                    <td>{entry.agentsCreated}</td>
                    <td>{entry.averageDefaultRate}%</td>
                    <td>{entry.averageTrustScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Approved agents</p>
            <h3>Agent Management</h3>
          </div>
        </div>
        <div className="workflowList topGap">
          {summary.approvedAgents.length ? (
            summary.approvedAgents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`workflowListItem ${selectedAgent?.id === agent.id ? "active" : ""}`}
                onClick={() => setSelectedAgent(agent)}
              >
                <strong>{agent.name}</strong>
                <span>{agent.agentCode}</span>
                <span>Created by: {agent.createdBy}</span>
                <span>{[agent.region, agent.subregion, agent.district].filter(Boolean).join(" / ")}</span>
                <span>Users referred: {agent.totalUsersReferred}</span>
                <span>Default rate: {agent.defaultRate}%</span>
                <span>Trust score: {agent.trustScore}</span>
                <StatusBadge value={agent.status} />
              </button>
            ))
          ) : (
            <p>No approved agents yet.</p>
          )}
        </div>
      </section>

      <section className="card">
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Agent details</p>
            <h3>{selectedDetail?.fullName || "Select an agent"}</h3>
          </div>
        </div>
        {!selectedDetail ? (
          <p>Select an approved agent to view details.</p>
        ) : (
          <div className="stack">
            <div className="buttonRow">
              <button
                type="button"
                onClick={() =>
                  handleAgentStatus(
                    selectedDetail.id,
                    selectedDetail.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"
                  )
                }
              >
                {selectedDetail.status === "SUSPENDED" ? "Reactivate Agent" : "Suspend Agent"}
              </button>
            </div>
            <form className="formGrid" onSubmit={handlePasswordReset}>
              <input
                type="password"
                placeholder="Temporary password"
                value={passwordResetForm.newTemporaryPassword}
                onChange={(event) => setPasswordResetForm((current) => ({ ...current, newTemporaryPassword: event.target.value }))}
              />
              <textarea
                placeholder="Reason for password reset"
                value={passwordResetForm.reason}
                onChange={(event) => setPasswordResetForm((current) => ({ ...current, reason: event.target.value }))}
              />
              <div className="buttonRow">
                <button type="submit" disabled={!passwordResetForm.newTemporaryPassword.trim() || !passwordResetForm.reason.trim()}>
                  Reset Password
                </button>
              </div>
            </form>
            <div className="detailGrid">
              <div className="detailGridRow"><span className="detailLabel">Agent ID</span><span className="detailValue">{selectedDetail.agentCode}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Created by</span><span className="detailValue">{selectedDetail.createdByAdmin?.fullName || "Unknown admin"}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Agent login email</span><span className="detailValue">{selectedDetail.loginEmail}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Country</span><span className="detailValue">{selectedDetail.country || "Uganda"}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Phone</span><span className="detailValue">{selectedDetail.phoneNumber}</span></div>
              <div className="detailGridRow"><span className="detailLabel">National ID</span><span className="detailValue">{selectedDetail.nationalId}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Region</span><span className="detailValue">{selectedDetail.region}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Subregion</span><span className="detailValue">{selectedDetail.subregion}</span></div>
              <div className="detailGridRow"><span className="detailLabel">District</span><span className="detailValue">{selectedDetail.district}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Administrative Unit</span><span className="detailValue">{selectedDetail.administrativeUnit || selectedDetail.county}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Sub Unit</span><span className="detailValue">{selectedDetail.subUnit || selectedDetail.subcounty}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Status</span><span className="detailValue">{selectedDetail.status}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Pending wallet</span><span className="detailValue">{formatCurrency(selectedDetail.wallet.pendingBalance)}</span></div>
              <div className="detailGridRow"><span className="detailLabel">Available wallet</span><span className="detailValue">{formatCurrency(selectedDetail.wallet.availableBalance)}</span></div>
            </div>

            <div className="workflowSplit">
              <div className="card insetCard">
                <h3>Referred users</h3>
                {!selectedDetail.referredUsers.length ? (
                  <p className="infoText">No referred users yet.</p>
                ) : (
                  <div className="stack compact">
                    {selectedDetail.referredUsers.map((entry) => (
                      <div key={entry.id} className="messageCard">
                        <strong>{entry.name}</strong>
                        <p>{entry.phone}</p>
                        <p>{[entry.region, entry.subregion, entry.district, entry.administrativeUnit || entry.county, entry.subUnit || entry.subcounty].filter(Boolean).join(" / ")}</p>
                        <p>{entry.loanStatus} • Days late: {entry.daysLate}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card insetCard">
                <h3>Loan performance stats</h3>
                <p>Total users referred: {selectedDetail.score?.totalUsersReferred || 0}</p>
                <p>Default rate: {selectedDetail.score?.defaultRate || 0}%</p>
                <p>Repayment rate: {selectedDetail.score?.repaymentRate || 0}%</p>
                <p>Geography factor: {selectedDetail.score?.geographyFactor || 50}</p>
                <p>Trust score: {selectedDetail.score?.trustScore || 0}</p>
              </div>
            </div>

            <div className="workflowSplit">
              <div className="card insetCard">
                <h3>Earnings summary</h3>
                {!selectedDetail.earnings.length ? (
                  <p className="infoText">No earnings yet.</p>
                ) : (
                  <div className="stack compact">
                    {selectedDetail.earnings.map((entry) => (
                      <div key={entry.id} className="messageCard">
                        <strong>{entry.type.replaceAll("_", " ")}</strong>
                        <p>{formatCurrency(entry.amount)} • {entry.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card insetCard">
                <h3>Penalties applied</h3>
                {!selectedDetail.penalties.length ? (
                  <p className="infoText">No penalties applied.</p>
                ) : (
                  <div className="stack compact">
                    {selectedDetail.penalties.map((entry) => (
                      <div key={entry.id} className="messageCard">
                        <strong>{formatCurrency(entry.amount)}</strong>
                        <p>{entry.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
