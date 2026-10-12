import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { BorrowerTopNav } from "../components/BorrowerTopNav";
import { useDashboardRealtime } from "../hooks/useDashboardRealtime";

function formatCurrency(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

const qualificationTips = [
  "Complete your current loan",
  "Make on-time repayments",
  "Improve your borrower score"
];

export function ApplicantPortalPage() {
  const [token, setToken] = useState(localStorage.getItem("alesun_applicant_token"));
  const [user, setUser] = useState(
    localStorage.getItem("alesun_applicant_user")
      ? JSON.parse(localStorage.getItem("alesun_applicant_user"))
      : null
  );
  const [eligibility, setEligibility] = useState(null);
  const [loanRequestStatus, setLoanRequestStatus] = useState(null);
  const [amount, setAmount] = useState("");
  const [pricingAccepted, setPricingAccepted] = useState(false);
  const [pricingPreview, setPricingPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    api.applicantMe(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("alesun_applicant_token");
        localStorage.removeItem("alesun_applicant_user");
        setToken(null);
        setUser(null);
      });
  }, [token]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([api.getLoanEligibility(token), api.getLoanRequestStatus(token)])
      .then(([eligibilityData, loanRequestData]) => {
        setEligibility(eligibilityData);
        setLoanRequestStatus(loanRequestData);
        setMessage(loanRequestData?.message || "");
      })
      .catch((error) => {
        setEligibility(null);
        setLoanRequestStatus(null);
        setMessage(error.message);
      })
      .finally(() => setIsLoading(false));
  }, [refreshTick, token]);

  const { isLive } = useDashboardRealtime({
    token,
    enabled: Boolean(token),
    onPoll: async () => {
      const [nextEligibility, nextLoanRequestStatus] = await Promise.all([
        api.getLoanEligibility(token),
        api.getLoanRequestStatus(token)
      ]);
      setEligibility(nextEligibility);
      setLoanRequestStatus(nextLoanRequestStatus);
      setMessage(nextLoanRequestStatus?.message || "");
    },
    handlers: {
      loan_status_updated: () => setRefreshTick((current) => current + 1),
      payment_update: () => setRefreshTick((current) => current + 1)
    }
  });

  const parsedAmount = Number(amount || 0);
  const requestIsPending = loanRequestStatus?.status === "PENDING";
  const requestWasRejected = loanRequestStatus?.status === "REJECTED";
  const requestWasApproved = loanRequestStatus?.status === "APPROVED";
  const formLocked = requestIsPending || requestWasApproved;
  const amountExceedsLimit = eligibility?.eligible && parsedAmount > Number(eligibility.maxLoanLimit || 0);
  const amountIsValid = eligibility?.eligible && !formLocked && Number.isFinite(parsedAmount) && parsedAmount > 0 && !amountExceedsLimit;

  useEffect(() => {
    setPricingAccepted(false);
  }, [amount]);

  useEffect(() => {
    if (!token || !amountIsValid) {
      setPricingPreview(null);
      return;
    }

    let isCurrent = true;

    api.getLoanPricing(token, parsedAmount)
      .then((data) => {
        if (isCurrent) {
          setPricingPreview(data.pricing || null);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setPricingPreview(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [amountIsValid, parsedAmount, token]);

  const validationMessage = useMemo(() => {
    if (!eligibility?.eligible) {
      return "";
    }
    if (formLocked) {
      return "";
    }
    if (!amount) {
      return "";
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return "Enter a valid loan amount greater than zero.";
    }
    if (amountExceedsLimit) {
      return `Loan amount cannot exceed ${formatCurrency(eligibility.maxLoanLimit)}.`;
    }
    return "";
  }, [amount, amountExceedsLimit, eligibility, parsedAmount]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!amountIsValid || !pricingAccepted) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await api.submitLoanRequest(token, { amount: parsedAmount, pricingAccepted });
      setAmount("");
      setPricingAccepted(false);
      const [nextEligibility, nextLoanRequestStatus] = await Promise.all([
        api.getLoanEligibility(token),
        api.getLoanRequestStatus(token)
      ]);
      setEligibility(nextEligibility);
      setLoanRequestStatus(nextLoanRequestStatus);
      setMessage(nextLoanRequestStatus?.message || "Your loan request has been submitted and is awaiting admin approval");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token || !user) {
    return (
      <div className="publicShell borrowerShell">
        <BorrowerTopNav />
        <section className="publicHero borrowerHero">
          <div className="borrowerWorkspaceLayout borrowerWorkspaceLayoutSingle">
            <div className="card borrowerEmptyWorkspace">
              <p className="eyebrow">Loan request</p>
              <h2>Apply for a Loan</h2>
              <p>Sign in with your applicant account first to check your eligibility and submit a controlled loan request.</p>
              <div className="buttonRow">
                <Link className="buttonLink" to="/my-account">
                  Go to My Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="publicShell borrowerShell">
      <BorrowerTopNav />
      <section className="publicHero borrowerHero">
        <div className="borrowerWorkspaceLayout borrowerWorkspaceLayoutSingle">
          <div className="card borrowerEmptyWorkspace">
            <p className="eyebrow">Controlled lending</p>
            <h2>Apply for a Loan</h2>
            <p className="headerMeta">Eligibility is checked before any request can be submitted.</p>
            <p className="liveStatusText">
              <span className={`liveStatusDot${isLive ? " connected" : ""}`} />
              {isLive ? "Live updates active" : "Live updates reconnecting"}
            </p>

            {isLoading ? (
              <p>Loading eligibility...</p>
            ) : eligibility ? (
              <div className="stack">
                <div className={`eligibilityPanel ${eligibility.eligible ? "eligibleState" : "ineligibleState"}`}>
                  <strong>
                    {requestIsPending
                      ? "Your loan request is awaiting admin approval"
                      : requestWasApproved
                        ? "Your loan has been approved"
                        : requestWasRejected
                          ? "Your previous loan request was not approved"
                          : eligibility.eligible
                      ? "You are eligible for a loan"
                      : "You are currently not eligible for a loan"}
                  </strong>
                  {requestIsPending || requestWasApproved || requestWasRejected ? (
                    <p>{loanRequestStatus?.message}</p>
                  ) : eligibility.eligible ? (
                    <p>Maximum eligible amount: {formatCurrency(eligibility.maxLoanLimit)}</p>
                  ) : (
                    <div className="stack compact">
                      <p>Reasons:</p>
                      <ul className="simpleList">
                        {eligibility.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                      <p>What you can do to qualify:</p>
                      <ul className="simpleList">
                        {qualificationTips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                      {eligibility.reasons.some((reason) => reason.toLowerCase().includes("onboarding")) && (
                        <div className="buttonRow">
                          <Link className="buttonLink" to="/onboarding">
                            Complete onboarding
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <form className="formGrid loanRequestForm" onSubmit={handleSubmit}>
                  <label className="fieldLabel">
                    Enter loan amount
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      disabled={!eligibility.eligible || isSubmitting || formLocked}
                      placeholder="Enter loan amount"
                    />
                  </label>
                  {loanRequestStatus?.referral?.agentCode ? (
                    <p className="infoText">
                      Linked agent: {loanRequestStatus.referral.agentName} ({loanRequestStatus.referral.agentCode})
                    </p>
                  ) : null}
                  {pricingPreview ? (
                    <div className="card insetCard">
                      <h3>Loan pricing summary</h3>
                      <div className="detailGrid borrowerDetailGrid topGap">
                        <div className="detailGridRow">
                          <span className="detailLabel">Loan requested</span>
                          <strong className="detailValue">{formatCurrency(pricingPreview.principalAmount)}</strong>
                        </div>
                        <div className="detailGridRow">
                          <span className="detailLabel">Processing fee (2%)</span>
                          <strong className="detailValue">{formatCurrency(pricingPreview.processingFee)}</strong>
                        </div>
                        <div className="detailGridRow">
                          <span className="detailLabel">Amount you will receive</span>
                          <strong className="detailValue">{formatCurrency(pricingPreview.disbursedAmount)}</strong>
                        </div>
                        <div className="detailGridRow">
                          <span className="detailLabel">Loan term</span>
                          <strong className="detailValue">{pricingPreview.loanTerm}</strong>
                        </div>
                        <div className="detailGridRow">
                          <span className="detailLabel">Interest (18% for 1 month)</span>
                          <strong className="detailValue">{formatCurrency(pricingPreview.interestAmount)}</strong>
                        </div>
                        <div className="detailGridRow">
                          <span className="detailLabel">Total amount to be repaid</span>
                          <strong className="detailValue">{formatCurrency(pricingPreview.totalRepayableAmount)}</strong>
                        </div>
                        <div className="detailGridRow">
                          <span className="detailLabel">Repayment is based on</span>
                          <strong className="detailValue">{formatCurrency(pricingPreview.totalRepayableAmount)}</strong>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <label className="fieldLabel checkboxField">
                    <span className="checkboxLabel">
                      <input
                        type="checkbox"
                        checked={pricingAccepted}
                        onChange={(event) => setPricingAccepted(event.target.checked)}
                        disabled={!pricingPreview || isSubmitting || formLocked}
                      />
                      <span>
                        I understand that a 2% processing fee will be deducted before disbursement, this is a 1-month loan, and I will repay the full loan amount plus 18% interest for the 1-month period.
                      </span>
                    </span>
                  </label>
                  {validationMessage && <p className="warningText">{validationMessage}</p>}
                  {message && <p className="infoText">{message}</p>}
                  <div className="buttonRow">
                    <button type="submit" disabled={!amountIsValid || !pricingAccepted || isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit loan request"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <p>{message || "We could not load your eligibility right now."}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
