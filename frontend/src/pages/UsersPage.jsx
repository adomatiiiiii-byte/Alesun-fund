import { useEffect, useMemo, useState } from "react";
import { API_URL, api } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../state/AuthContext";

function formatDateTime(value) {
  if (!value) {
    return "Not submitted";
  }

  return new Date(value).toLocaleString("en-GB", {
    hour12: false
  });
}

function formatMoney(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

function createEmptyBorrowerDetail() {
  return {
    lastOnline: null,
    profile: null,
    activeLoan: null,
    repaymentHistory: [],
    borrowerScore: {
      score: 0,
      label: "Unknown",
      positiveFactors: [],
      negativeFactors: []
    },
    eligibility: {
      eligible: false,
      statusText: "Not available",
      reasons: []
    },
    messages: [],
    applications: []
  };
}

export function UsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [adminMessageBody, setAdminMessageBody] = useState("");
  const [agentReassignment, setAgentReassignment] = useState({ agentCode: "", reason: "" });
  const [passwordResetForm, setPasswordResetForm] = useState({ newTemporaryPassword: "", reason: "" });
  const [expandedImage, setExpandedImage] = useState(null);
  const [detailMessage, setDetailMessage] = useState("");

  useEffect(() => {
    api.getAdminUsers(token)
      .then((data) => setUsers(data.users))
      .catch((error) => setDetailMessage(error.message));
  }, [token]);

  const selectedUser = useMemo(
    () => users.find((entry) => entry.id === selectedUserId) || users[0] || null,
    [selectedUserId, users]
  );
  const secureFileBase = API_URL.replace(/\/api$/, "");

  useEffect(() => {
    if (!selectedUser?.id) {
      setSelectedUserDetail(createEmptyBorrowerDetail());
      return;
    }

    let isCurrent = true;

    async function loadDetail({ silent = false } = {}) {
      if (!silent) {
        setSelectedUserDetail(createEmptyBorrowerDetail());
        setDetailMessage("");
        setIsDetailLoading(true);
      }

      try {
        const data = await api.getAdminUserDetail(token, selectedUser.id);
        if (isCurrent) {
          setSelectedUserDetail(data.detail || createEmptyBorrowerDetail());
        }
      } catch (error) {
        if (isCurrent) {
          setSelectedUserDetail(createEmptyBorrowerDetail());
          setDetailMessage(error.message);
        }
      } finally {
        if (isCurrent && !silent) {
          setIsDetailLoading(false);
        }
      }
    }

    loadDetail();
    const pollId = setInterval(() => {
      loadDetail({ silent: true });
    }, 5000);

    return () => {
      isCurrent = false;
      clearInterval(pollId);
    };
  }, [selectedUser?.id, token]);

  useEffect(() => {
    setAdminMessageBody("");
    setAgentReassignment({ agentCode: "", reason: "" });
    setPasswordResetForm({ newTemporaryPassword: "", reason: "" });
  }, [selectedUser?.id]);

  async function openDocument(userId, field) {
    try {
      const response = await fetch(`${secureFileBase}/api/admin/users/${userId}/files/${field}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Unable to open document");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (blob.type.startsWith("image/")) {
        setExpandedImage({ src: objectUrl, label: field });
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    } catch (error) {
      setDetailMessage(error.message);
    }
  }

  async function updateStatus(status) {
    if (!selectedUser) {
      return;
    }

    try {
      const response = await api.updateAdminUserVerification(token, selectedUser.id, { status });
      setUsers((current) =>
        current.map((entry) =>
          entry.id === selectedUser.id
            ? { ...entry, verificationStatus: response.verificationStatus.status }
            : entry
        )
      );
      setDetailMessage(`Verification status updated to ${status}.`);
    } catch (error) {
      setDetailMessage(error.message);
    }
  }

  async function handleSendAdminMessage(event) {
    event.preventDefault();
    if (!selectedUser?.id || !adminMessageBody.trim()) {
      return;
    }

    try {
      await api.sendAdminUserMessage(token, selectedUser.id, { body: adminMessageBody });
      setAdminMessageBody("");
      setDetailMessage("Message sent to borrower.");
      const data = await api.getAdminUserDetail(token, selectedUser.id);
      setSelectedUserDetail(data.detail || createEmptyBorrowerDetail());
    } catch (error) {
      setDetailMessage(error.message);
    }
  }

  async function handleAgentReassignment(event) {
    event.preventDefault();
    if (!selectedUser?.id || !agentReassignment.agentCode.trim() || !agentReassignment.reason.trim()) {
      return;
    }

    try {
      await api.reassignAdminUserAgent(token, selectedUser.id, agentReassignment);
      setDetailMessage("Assigned agent updated.");
      setAgentReassignment({ agentCode: "", reason: "" });
      const data = await api.getAdminUserDetail(token, selectedUser.id);
      setSelectedUserDetail(data.detail || createEmptyBorrowerDetail());
    } catch (error) {
      setDetailMessage(error.message);
    }
  }

  async function handleManualPasswordReset(event) {
    event.preventDefault();
    if (!selectedUser?.id) {
      return;
    }

    try {
      const response = await api.manualPasswordReset(token, {
        accountType: "USER",
        accountId: selectedUser.id,
        newTemporaryPassword: passwordResetForm.newTemporaryPassword,
        reason: passwordResetForm.reason
      });
      setDetailMessage(response.message);
      setPasswordResetForm({ newTemporaryPassword: "", reason: "" });
    } catch (error) {
      setDetailMessage(error.message);
    }
  }

  return (
    <div className="workflowLayout">
      <article className="card workflowRail">
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Verification queue</p>
            <h2>Users</h2>
          </div>
        </div>
        <div className="workflowList">
          {users.length ? (
            users.map((user) => (
              <button
                key={user.id}
                type="button"
                className={`workflowListItem ${selectedUser?.id === user.id ? "active" : ""}`}
                onClick={() => setSelectedUserId(user.id)}
              >
                <strong>{user.ownerInfo?.fullName || user.email}</strong>
                <span>{user.businessInfo?.businessName || "Business not started"}</span>
                <span>{user.completionPercent}% complete</span>
                <StatusBadge value={user.verificationStatus} />
              </button>
            ))
          ) : (
            <p className="infoText">No onboarding users yet.</p>
          )}
        </div>
      </article>

      <article className="card workflowWorkspace">
        {selectedUser ? (
          <div className="stack">
            <section className="pageHeader">
              <div>
                <p className="eyebrow">Onboarding review</p>
                <h2>{selectedUser.ownerInfo?.fullName || selectedUser.email}</h2>
                <p className="headerMeta">Submitted: {formatDateTime(selectedUser.submittedAt)}</p>
              </div>
              <StatusBadge value={selectedUser.verificationStatus} />
            </section>

            <section className="workflowSplit">
              <article className="card insetCard">
                <h3>Owner Information</h3>
                {selectedUser.ownerInfo ? (
                    <div className="detailGrid">
                      <div className="detailGridRow"><span className="detailLabel">Full name</span><span className="detailValue">{selectedUser.ownerInfo.fullName}</span></div>
                    <div className="detailGridRow"><span className="detailLabel">NIN</span><span className="detailValue">{selectedUser.ownerInfo.nin}</span></div>
                    <div className="detailGridRow"><span className="detailLabel">Date of birth</span><span className="detailValue">{String(selectedUser.ownerInfo.dateOfBirth).slice(0, 10)}</span></div>
                    <div className="detailGridRow"><span className="detailLabel">Phone</span><span className="detailValue">{selectedUser.ownerInfo.phone}</span></div>
                    <div className="detailGridRow"><span className="detailLabel">Email</span><span className="detailValue">{selectedUser.ownerInfo.email}</span></div>
                      <div className="detailGridRow"><span className="detailLabel">Address</span><span className="detailValue">{selectedUser.ownerInfo.address}</span></div>
                      <div className="detailGridRow"><span className="detailLabel">Position</span><span className="detailValue">{selectedUser.ownerInfo.position}</span></div>
                      <div className="detailGridRow"><span className="detailLabel">Assigned agent</span><span className="detailValue">{selectedUser.ownerInfo.agentReferralId || "Not assigned"}</span></div>
                      <div className="detailGridRow"><span className="detailLabel">Country</span><span className="detailValue">{selectedUser.ownerInfo.country || "Uganda"}</span></div>
                      <div className="detailGridRow"><span className="detailLabel">Region</span><span className="detailValue">{selectedUser.ownerInfo.region || "Not set"}</span></div>
                      <div className="detailGridRow"><span className="detailLabel">Subregion</span><span className="detailValue">{selectedUser.ownerInfo.subregion || "Not set"}</span></div>
                      <div className="detailGridRow"><span className="detailLabel">District</span><span className="detailValue">{selectedUser.ownerInfo.district || "Not set"}</span></div>
                      <div className="detailGridRow"><span className="detailLabel">Subcounty</span><span className="detailValue">{selectedUser.ownerInfo.subcounty || "Not set"}</span></div>
                      <div className="detailGridRow"><span className="detailLabel">Village</span><span className="detailValue">{selectedUser.ownerInfo.village || "Not set"}</span></div>
                    </div>
                ) : (
                  <p className="infoText">Owner information not completed.</p>
                )}
              </article>

              <article className="card insetCard">
                <h3>Business Information</h3>
                {selectedUser.businessInfo ? (
                  <div className="detailGrid">
                    <div className="detailGridRow"><span className="detailLabel">Business name</span><span className="detailValue">{selectedUser.businessInfo.businessName}</span></div>
                    <div className="detailGridRow"><span className="detailLabel">Location</span><span className="detailValue">{selectedUser.businessInfo.location}</span></div>
                    <div className="detailGridRow"><span className="detailLabel">Industry</span><span className="detailValue">{selectedUser.businessInfo.industry}</span></div>
                    <div className="detailGridRow"><span className="detailLabel">Years in operation</span><span className="detailValue">{selectedUser.businessInfo.yearsInOperation}</span></div>
                    <div className="detailGridRow"><span className="detailLabel">Weekly revenue</span><span className="detailValue">UGX {Number(selectedUser.businessInfo.weeklyRevenue || 0).toLocaleString()}</span></div>
                    <div className="detailGridRow"><span className="detailLabel">Weekly expenses</span><span className="detailValue">UGX {Number(selectedUser.businessInfo.weeklyExpenses || 0).toLocaleString()}</span></div>
                  </div>
                ) : (
                  <p className="infoText">Business information not completed.</p>
                )}
              </article>
            </section>

            <section className="card insetCard">
              <h3>Documents</h3>
              {selectedUser.documents ? (
                <div className="imageGallery topGap">
                  <button type="button" className="imageThumb empty" onClick={() => openDocument(selectedUser.id, "idFrontImage")}>
                    <span>ID Front Image</span>
                    <small>Open file</small>
                  </button>
                  <button type="button" className="imageThumb empty" onClick={() => openDocument(selectedUser.id, "idBackImage")}>
                    <span>ID Back Image</span>
                    <small>Open file</small>
                  </button>
                  <button type="button" className="imageThumb empty" onClick={() => openDocument(selectedUser.id, "tradingLicense")}>
                    <span>Trading License</span>
                    <small>Open file</small>
                  </button>
                </div>
              ) : (
                <p className="infoText">Documents have not been submitted yet.</p>
              )}
            </section>

            <section className="card insetCard">
              <div className="pageHeader">
                <div>
                  <p className="eyebrow">Admin actions</p>
                  <h3>Verification Decision</h3>
                </div>
                <strong>{selectedUser.completionPercent}%</strong>
              </div>
              <div className="buttonRow topGap">
                <button
                  type="button"
                  onClick={() => updateStatus("VERIFIED")}
                  disabled={selectedUser.verificationStatus === "VERIFIED" || selectedUser.completedSteps < 3}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => updateStatus("REJECTED")}
                  disabled={selectedUser.verificationStatus === "REJECTED" || selectedUser.completedSteps < 3}
                >
                  Reject
                </button>
              </div>
              {detailMessage && <p className="infoText topGap">{detailMessage}</p>}
            </section>

            <section className="card insetCard">
              <div className="pageHeader">
                <div>
                  <p className="eyebrow">Borrower profile</p>
                  <h3>Live account details</h3>
                </div>
              </div>

              {isDetailLoading ? (
                <p className="infoText">Loading borrower details...</p>
              ) : (
                <div className="stack topGap">
                  <section className="miniMetricsGrid">
                    <article className="miniMetric">
                      <span>Last online</span>
                      <strong>{formatDateTime(selectedUserDetail.lastOnline?.at)}</strong>
                    </article>
                    <article className="miniMetric">
                      <span>Borrower score</span>
                      <strong>{selectedUserDetail.borrowerScore?.score ?? 0}</strong>
                    </article>
                    <article className="miniMetric">
                      <span>Score band</span>
                      <strong>{selectedUserDetail.borrowerScore?.label || "Unknown"}</strong>
                    </article>
                    <article className="miniMetric">
                      <span>Loan eligibility</span>
                      <strong>{selectedUserDetail.eligibility?.statusText || "Not eligible"}</strong>
                    </article>
                  </section>
                  {detailMessage ? <p className="warningText">{detailMessage}</p> : null}

                  <section className="workflowSplit">
                    <article className="card insetCard">
                      <h3>Assigned agent and location</h3>
                      {selectedUserDetail.profile ? (
                        <div className="detailGrid">
                          <div className="detailGridRow"><span className="detailLabel">Agent</span><span className="detailValue">{selectedUserDetail.profile.assignedAgent?.fullName || "Not assigned"}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Agent ID</span><span className="detailValue">{selectedUserDetail.profile.agentReferralId || "Not assigned"}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Country</span><span className="detailValue">{selectedUserDetail.profile.country || "Uganda"}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Region</span><span className="detailValue">{selectedUserDetail.profile.region || "Not set"}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Subregion</span><span className="detailValue">{selectedUserDetail.profile.subregion || "Not set"}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">District</span><span className="detailValue">{selectedUserDetail.profile.district || "Not set"}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Subcounty</span><span className="detailValue">{selectedUserDetail.profile.subcounty || "Not set"}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Village</span><span className="detailValue">{selectedUserDetail.profile.village || "Not set"}</span></div>
                        </div>
                      ) : (
                        <p className="infoText">No stored agent or location details yet.</p>
                      )}
                      {user?.role === "SUPER_ADMIN" ? (
                        <div className="stack topGap">
                          <form className="formGrid" onSubmit={handleAgentReassignment}>
                            <input
                              placeholder="New agent ID"
                              value={agentReassignment.agentCode}
                              onChange={(event) => setAgentReassignment((current) => ({ ...current, agentCode: event.target.value.toUpperCase() }))}
                            />
                            <textarea
                              placeholder="Reason for reassignment"
                              value={agentReassignment.reason}
                              onChange={(event) => setAgentReassignment((current) => ({ ...current, reason: event.target.value }))}
                            />
                            <div className="buttonRow">
                              <button type="submit" disabled={!agentReassignment.agentCode.trim() || !agentReassignment.reason.trim()}>
                                Reassign agent
                              </button>
                            </div>
                          </form>
                          <form className="formGrid" onSubmit={handleManualPasswordReset}>
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
                        </div>
                      ) : null}
                    </article>

                    <article className="card insetCard">
                      <h3>Active loan details</h3>
                      {selectedUserDetail.activeLoan ? (
                        <div className="detailGrid">
                          <div className="detailGridRow"><span className="detailLabel">Loan amount</span><span className="detailValue">{formatMoney(selectedUserDetail.activeLoan.principalAmount)}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Processing fee</span><span className="detailValue">{formatMoney(selectedUserDetail.activeLoan.processingFee)}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Amount received</span><span className="detailValue">{formatMoney(selectedUserDetail.activeLoan.disbursedAmount)}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Loan term</span><span className="detailValue">{selectedUserDetail.activeLoan.loanTerm}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Interest (1 month)</span><span className="detailValue">{formatMoney(selectedUserDetail.activeLoan.interestAmount)}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Total repayable</span><span className="detailValue">{formatMoney(selectedUserDetail.activeLoan.totalRepayableAmount)}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Start date</span><span className="detailValue">{formatDateTime(selectedUserDetail.activeLoan.startDate)}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Due date</span><span className="detailValue">{formatDateTime(selectedUserDetail.activeLoan.dueDate)}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Total paid</span><span className="detailValue">{formatMoney(selectedUserDetail.activeLoan.totalPaid)}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Remaining balance</span><span className="detailValue">{formatMoney(selectedUserDetail.activeLoan.remainingBalance)}</span></div>
                          <div className="detailGridRow"><span className="detailLabel">Repayment progress</span><span className="detailValue">{selectedUserDetail.activeLoan.progressPercent}%</span></div>
                        </div>
                      ) : (
                        <p className="infoText">No active loan on this borrower profile.</p>
                      )}
                    </article>

                    <article className="card insetCard">
                      <h3>Loan eligibility</h3>
                      <div className="detailGrid">
                        <div className="detailGridRow"><span className="detailLabel">Status</span><span className="detailValue">{selectedUserDetail.eligibility?.statusText || "Not eligible"}</span></div>
                        {"eligibleLoanAmount" in (selectedUserDetail.eligibility || {}) && selectedUserDetail.eligibility?.eligibleLoanAmount ? (
                          <div className="detailGridRow"><span className="detailLabel">Eligible amount</span><span className="detailValue">{formatMoney(selectedUserDetail.eligibility.eligibleLoanAmount)}</span></div>
                        ) : null}
                        {selectedUserDetail.eligibility?.message ? (
                          <div className="detailGridRow"><span className="detailLabel">Guidance</span><span className="detailValue">{selectedUserDetail.eligibility.message}</span></div>
                        ) : null}
                        {selectedUserDetail.eligibility?.reasons?.length ? (
                          <div className="detailGridRow">
                            <span className="detailLabel">Reasons</span>
                            <div className="detailValue">
                              <ul className="simpleList">
                                {selectedUserDetail.eligibility.reasons.map((reason) => (
                                  <li key={reason}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  </section>

                  <section className="workflowSplit">
                    <article className="card insetCard">
                      <h3>Repayments</h3>
                      {selectedUserDetail.repaymentHistory?.length ? (
                        <div className="tableWrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedUserDetail.repaymentHistory.map((payment) => (
                                <tr key={payment.id}>
                                  <td>{formatDateTime(payment.date)}</td>
                                  <td>{formatMoney(payment.amount)}</td>
                                  <td><StatusBadge value={payment.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="infoText">No repayments recorded yet.</p>
                      )}
                    </article>

                    <article className="card insetCard">
                      <h3>Borrower score</h3>
                      <div className="stack compact">
                        <div className="borrowerScoreCard">
                          <strong className="borrowerScoreValue">{selectedUserDetail.borrowerScore?.score ?? 0}</strong>
                          <div>
                            <p className="borrowerScoreLabel">{selectedUserDetail.borrowerScore?.label || "Unknown"}</p>
                            <p className="headerMeta">Scored from repayment behavior and borrowing history.</p>
                          </div>
                        </div>
                        {selectedUserDetail.borrowerScore?.positiveFactors?.length ? (
                          <div>
                            <p className="detailLabel">Positive factors</p>
                            <ul className="simpleList">
                              {selectedUserDetail.borrowerScore.positiveFactors.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {selectedUserDetail.borrowerScore?.negativeFactors?.length ? (
                          <div>
                            <p className="detailLabel">Risk factors</p>
                            <ul className="simpleList">
                              {selectedUserDetail.borrowerScore.negativeFactors.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  </section>

                  <section className="workflowSplit">
                    <article className="card insetCard">
                      <h3>Messages</h3>
                      {selectedUserDetail.messages?.length ? (
                        <div className="stack compact">
                          {selectedUserDetail.messages.map((message) => (
                            <article key={message.id} className="messageCard">
                              <div className="pageHeader">
                                <strong>{message.senderName}</strong>
                                <span className="headerMeta">{formatDateTime(message.createdAt)}</span>
                              </div>
                              <p className="headerMeta">{message.senderRole}</p>
                              <p>{message.body}</p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="infoText">No borrower messages have been sent yet.</p>
                      )}
                      <form className="formGrid topGap" onSubmit={handleSendAdminMessage}>
                        <textarea
                          placeholder="Reply to this borrower"
                          value={adminMessageBody}
                          onChange={(event) => setAdminMessageBody(event.target.value)}
                        />
                        <div className="buttonRow">
                          <button type="submit" disabled={!adminMessageBody.trim()}>
                            Send message
                          </button>
                        </div>
                      </form>
                    </article>

                    <article className="card insetCard">
                      <h3>Loan application history</h3>
                      {selectedUserDetail.applications?.length ? (
                        <div className="tableWrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Business</th>
                                <th>Submitted</th>
                                <th>Amount</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedUserDetail.applications.map((application) => (
                                <tr key={application.id}>
                                  <td>{application.businessName}</td>
                                  <td>{formatDateTime(application.submittedAt)}</td>
                                  <td>{formatMoney(application.amount)}</td>
                                  <td><StatusBadge value={application.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="infoText">No loan applications found for this borrower yet.</p>
                      )}
                    </article>
                  </section>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="workflowWorkspaceEmpty">
            <p className="eyebrow">Onboarding verification</p>
            <h2>Select a user</h2>
            <p className="infoText">Choose an onboarding record from the queue to review its owner info, business info, and documents.</p>
          </div>
        )}
      </article>

      {expandedImage && (
        <div className="imageOverlay" onClick={() => setExpandedImage(null)}>
          <div className="imageOverlayCard" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="imageOverlayClose" onClick={() => setExpandedImage(null)}>
              X
            </button>
            <img src={expandedImage.src} alt={expandedImage.label} />
            <p>{expandedImage.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}
