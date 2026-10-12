import { useEffect, useState } from "react";
import { api } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../state/AuthContext";

function formatMoney(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

export function LoansPage() {
  const { token, user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);
  const [selectedLoanRequestId, setSelectedLoanRequestId] = useState(null);
  const [loanForm, setLoanForm] = useState({
    loanRequestId: "",
    applicationId: "",
    principal: ""
  });
  const [paymentAmount, setPaymentAmount] = useState({});
  const [formMessage, setFormMessage] = useState("");

  const readyApplications = applications.filter((application) => !application.loan && application.status === "APPROVED");
  const approvedLoanRequests = loanRequests.filter(
    (request) => request.status === "APPROVED" && !request.linkedApplication?.loan?.id
  );
  const selectedLoanRequest =
    loanRequests.find((request) => request.id === selectedLoanRequestId) || loanRequests[0] || null;
  const canManageRisk = user?.role === "RISK_ADMIN" || user?.role === "SUPER_ADMIN";
  const canManageFinance = user?.role === "FINANCE_ADMIN" || user?.role === "SUPER_ADMIN";

  const pricingPreview = loanForm.principal
    ? {
        principalAmount: Number(loanForm.principal || 0),
        processingFee: Math.round(Number(loanForm.principal || 0) * 0.02),
        interestAmount: Math.round(Number(loanForm.principal || 0) * 0.18),
        loanTerm: "1 month"
      }
    : null;

  if (pricingPreview) {
    pricingPreview.disbursedAmount = Math.max(0, pricingPreview.principalAmount - pricingPreview.processingFee);
    pricingPreview.totalRepayableAmount = pricingPreview.principalAmount + pricingPreview.interestAmount;
  }

  const load = async () => {
    const [applicationsData, loansData, loanRequestsData] = await Promise.all([
      api.getAdminApplications(token, { status: "APPROVED" }),
      api.getLoans(token),
      api.getAdminLoanRequests(token)
    ]);
    setApplications(applicationsData.applications);
    setLoans(loansData.loans);
    setLoanRequests(loanRequestsData.loanRequests);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [token]);

  async function createLoan(event) {
    event.preventDefault();
    setFormMessage("");
    if (!loanForm.applicationId && !loanForm.loanRequestId) {
      setFormMessage("Select an approved loan request first.");
      return;
    }
    try {
      const payload = {
        principal: Number(loanForm.principal),
        ...(loanForm.loanRequestId ? { loanRequestId: loanForm.loanRequestId } : {}),
        ...(loanForm.applicationId ? { applicationId: loanForm.applicationId } : {})
      };

      await api.createLoan(token, payload);
      setLoanForm({ loanRequestId: "", applicationId: "", principal: "" });
      await load();
      setFormMessage("Loan created successfully. You can disburse it from the created loans list.");
    } catch (error) {
      setFormMessage(error.message || "Unable to create loan.");
    }
  }

  function prepareLoanFromApplication(application) {
    setLoanForm({
      loanRequestId: "",
      applicationId: application.id,
      principal: Number(application.loanRequestAmount || 0)
    });
  }

  function prepareLoanFromRequest(request) {
    setLoanForm({
      loanRequestId: request.id,
      applicationId: request.linkedApplication?.id || "",
      principal: Number(request.amount || 0)
    });
    setFormMessage(
      request.linkedApplication?.id
        ? ""
        : "This approved loan request will use the borrower details already available under Users to create the loan."
    );
  }

  async function updateLoanRequestStatus(id, status) {
    const response = await api.updateAdminLoanRequestStatus(token, id, { status });
    await load();
    setFormMessage(
      status === "APPROVED"
        ? "Loan request approved and converted into a loan."
        : "Loan request rejected. The borrower can apply again."
    );
  }

  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Loan Operations</p>
          <h2>
            {canManageRisk && canManageFinance
              ? "Approvals, disbursements, and repayments"
              : canManageRisk
                ? "Risk review, KYC, and approval workflow"
                : "Disbursement, repayments, and overdue tracking"}
          </h2>
        </div>
      </section>
      {canManageRisk ? (
        <section className="splitGrid">
          <article className="card">
            <div className="pageHeader">
              <div>
                <p className="eyebrow">Applicant lending controls</p>
                <h3>Loan Requests</h3>
              </div>
              <strong>{loanRequests.filter((request) => request.status === "PENDING").length}</strong>
            </div>
            <div className="workflowList topGap">
              {loanRequests.length ? (
                loanRequests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    className={`workflowListItem ${selectedLoanRequest?.id === request.id ? "active" : ""}`}
                    onClick={() => setSelectedLoanRequestId(request.id)}
                  >
                    <strong>{request.user.fullName}</strong>
                    <span>{request.user.email}</span>
                    <span>UGX {Number(request.amount).toLocaleString()}</span>
                    <StatusBadge value={request.status} />
                  </button>
                ))
              ) : (
                <p>No loan requests yet.</p>
              )}
            </div>
          </article>
          <article className="card">
            {selectedLoanRequest ? (
              <div className="stack compact">
                <p className="eyebrow">Structured loan request</p>
                <h3>{selectedLoanRequest.user.fullName}</h3>
                <p><strong>Email:</strong> {selectedLoanRequest.user.email}</p>
                <p><strong>Requested amount:</strong> UGX {Number(selectedLoanRequest.amount).toLocaleString()}</p>
                <p><strong>Status:</strong> <StatusBadge value={selectedLoanRequest.status} /></p>
                <p><strong>Assigned agent:</strong> {selectedLoanRequest.agent?.fullName || "Not linked"} {selectedLoanRequest.agent?.agentCode ? `(${selectedLoanRequest.agent.agentCode})` : ""}</p>
                <p><strong>Borrower location:</strong> {[selectedLoanRequest.region, selectedLoanRequest.subregion, selectedLoanRequest.district, selectedLoanRequest.subcounty].filter(Boolean).join(" / ")}</p>
                <p><strong>Submitted:</strong> {new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                }).format(new Date(selectedLoanRequest.createdAt))}</p>
                {selectedLoanRequest.status === "PENDING" && (
                  <div className="buttonRow">
                    <button type="button" onClick={() => updateLoanRequestStatus(selectedLoanRequest.id, "APPROVED")}>
                      Recommend Approve
                    </button>
                    <button
                      type="button"
                      className="ghostButton"
                      onClick={() => updateLoanRequestStatus(selectedLoanRequest.id, "REJECTED")}
                    >
                      Recommend Reject
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p>Select a loan request to review it.</p>
            )}
          </article>
        </section>
      ) : null}
      <section className="splitGrid">
        {canManageRisk ? (
          <form className="card formGrid" onSubmit={createLoan}>
            <h3>Create loan from request</h3>
            <select
              value={loanForm.loanRequestId}
              onChange={(event) => {
                const request = approvedLoanRequests.find((item) => item.id === event.target.value);
                if (!request) {
                  setLoanForm({ ...loanForm, loanRequestId: "", applicationId: "" });
                  setFormMessage("");
                  return;
                }
                prepareLoanFromRequest(request);
              }}
            >
              <option value="">Select loan request</option>
              {approvedLoanRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.user.fullName} - UGX {Number(request.amount).toLocaleString()}
                  {!request.linkedApplication?.id ? " - borrower data ready" : ""}
                </option>
              ))}
            </select>
            <input placeholder="Principal" type="number" value={loanForm.principal} onChange={(event) => setLoanForm({ ...loanForm, principal: event.target.value })} />
            {pricingPreview ? (
              <div className="detailGrid borrowerDetailGrid">
                <div className="detailGridRow"><span className="detailLabel">Processing fee (2%)</span><span className="detailValue">{formatMoney(pricingPreview.processingFee)}</span></div>
                <div className="detailGridRow"><span className="detailLabel">Amount to disburse</span><span className="detailValue">{formatMoney(pricingPreview.disbursedAmount)}</span></div>
                <div className="detailGridRow"><span className="detailLabel">Interest (18% for 1 month)</span><span className="detailValue">{formatMoney(pricingPreview.interestAmount)}</span></div>
                <div className="detailGridRow"><span className="detailLabel">Total repayable</span><span className="detailValue">{formatMoney(pricingPreview.totalRepayableAmount)}</span></div>
                <div className="detailGridRow"><span className="detailLabel">Loan term</span><span className="detailValue">{pricingPreview.loanTerm}</span></div>
              </div>
            ) : null}
            {formMessage ? <p className="infoText">{formMessage}</p> : null}
            <button type="submit">Approve loan</button>
          </form>
        ) : (
          <article className="card">
            <h3>Finance operations scope</h3>
            <p className="infoText">
              Loan approval controls are restricted to Risk Admin. Finance Admin can track approved facilities,
              disbursements, repayments, and overdue positions from the operations queue.
            </p>
          </article>
        )}
        <article className="card">
          <h3>Loan operations queue</h3>
          <div className="stack compact">
            {approvedLoanRequests.length ? (
              <div className="loanQueueGroup">
                <h4>Approved loan requests ready for facility setup</h4>
                {approvedLoanRequests.map((request) => (
                <div key={request.id} className="loanRow">
                  <div>
                      <strong>{request.user.fullName}</strong>
                      <p>
                        {formatMoney(request.amount)} approved and ready to convert into a loan
                        {request.linkedApplication?.business?.name ? ` for ${request.linkedApplication.business.name}` : ""}
                      </p>
                      <StatusBadge value="READY_FOR_LOAN_SETUP" />
                      {!request.linkedApplication?.id ? (
                        <div className="loanBorrowerFacts topGap">
                          <p className="infoText"><strong>Phone:</strong> {request.user.profile?.phone || "Not available"}</p>
                          <p className="infoText"><strong>NIN:</strong> {request.user.profile?.nin || "Not available"}</p>
                          <p className="infoText"><strong>Agent:</strong> {request.agent?.fullName || "Not linked"} {request.agent?.agentCode ? `(${request.agent.agentCode})` : ""}</p>
                          <p className="infoText"><strong>Country:</strong> {request.user.country || "Uganda"}</p>
                          <p className="infoText"><strong>Region:</strong> {request.user.region || "Not available"}</p>
                          <p className="infoText"><strong>Subregion:</strong> {request.user.subregion || "Not available"}</p>
                          <p className="infoText"><strong>District:</strong> {request.user.district || "Not available"}</p>
                          <p className="infoText"><strong>Subcounty:</strong> {request.user.subcounty || "Not available"}</p>
                          <p className="infoText"><strong>Village:</strong> {request.user.village || "Not available"}</p>
                          <p className="infoText"><strong>Business:</strong> {request.user.business?.name || "Not available"}</p>
                          <p className="infoText"><strong>Industry:</strong> {request.user.business?.industry || "Not available"}</p>
                          <p className="infoText"><strong>Location:</strong> {request.user.business?.location || "Not available"}</p>
                          <p className="infoText"><strong>Years in operation:</strong> {request.user.business?.yearsInOperation ?? "Not available"}</p>
                          <p className="infoText"><strong>Weekly revenue:</strong> {request.user.business?.weeklyRevenue ? formatMoney(request.user.business.weeklyRevenue) : "Not available"}</p>
                          <p className="infoText"><strong>Weekly expenses:</strong> {request.user.business?.weeklyExpenses ? formatMoney(request.user.business.weeklyExpenses) : "Not available"}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="loanActions">
                      <button onClick={() => prepareLoanFromRequest(request)}>Set up facility</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="loanQueueGroup">
              <h4>Created loans</h4>
            {loans.map((loan) => (
              <div key={loan.id} className="loanRow">
                <div>
                  <strong>{loan.application.business.name}</strong>
                  <p>{formatMoney(loan.principalAmount || loan.principal)} for {loan.loanTerm || "1 month"}</p>
                  <p>Disburse {formatMoney(loan.disbursedAmount)} • Repay {formatMoney(loan.totalRepayableAmount || loan.remainingBalance)}</p>
                  <StatusBadge value={loan.status} />
                </div>
                <div className="loanActions">
                  {!loan.disbursedAt && loan.status === "ACTIVE" && canManageFinance && (
                    <button onClick={() => api.disburseLoan(token, loan.id).then(load)}>Disburse</button>
                  )}
                  {loan.status === "ACTIVE" && loan.disbursedAt && canManageFinance && (
                    <>
                      <input
                        type="number"
                        placeholder="Payment"
                        value={paymentAmount[loan.id] || ""}
                        onChange={(event) =>
                          setPaymentAmount({ ...paymentAmount, [loan.id]: event.target.value })
                        }
                      />
                      <button
                        onClick={() =>
                          api
                            .recordPayment(token, loan.id, { amount: Number(paymentAmount[loan.id] || 0) })
                            .then(load)
                        }
                      >
                        Record payment
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!loans.length ? <p>No loans created yet.</p> : null}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
