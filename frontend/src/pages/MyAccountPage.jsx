import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, api } from "../api";
import { BorrowerTopNav } from "../components/BorrowerTopNav";
import { StatusBadge } from "../components/StatusBadge";
import { useDashboardRealtime } from "../hooks/useDashboardRealtime";

function formatCurrency(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString("en-GB");
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-GB", {
    hour12: false
  });
}

function SummaryMetric({ label, value, hint }) {
  return (
    <article className="metricCard borrowerMetric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

const sectionNavItems = [
  { key: "accountDetails", label: "Acccount Details" },
  { key: "messages", label: "Messaging" },
  { key: "notifications", label: "Notifications" },
  { key: "history", label: "Application History" }
];

export function MyAccountPage() {
  const [account, setAccount] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [user, setUser] = useState(
    localStorage.getItem("alesun_applicant_user")
      ? JSON.parse(localStorage.getItem("alesun_applicant_user"))
      : null
  );
  const [token, setToken] = useState(localStorage.getItem("alesun_applicant_token"));
  const [messageBody, setMessageBody] = useState("");
  const [messageAttachments, setMessageAttachments] = useState([]);
  const [messageStatus, setMessageStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("accountDetails");
  const [showRepaymentHistory, setShowRepaymentHistory] = useState(false);
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!token) {
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
    Promise.all([api.getMyAccount(token), api.getOnboardingStatus(token)])
      .then(([accountData, onboardingData]) => {
        setAccount(accountData);
        setOnboarding(onboardingData);
        setMessageStatus("");
      })
      .catch((error) => {
        setAccount(null);
        setOnboarding(null);
        setMessageStatus(error.message);
      })
      .finally(() => setIsLoading(false));
  }, [refreshTick, token]);

  const currentApplicationId = useMemo(() => account?.applications?.[0]?.id || null, [account]);
  const orderedMessages = useMemo(
    () =>
      [...(account?.messages || [])].sort(
        (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
      ),
    [account?.messages]
  );
  const secureFileBase = API_URL.replace(/\/api$/, "");
  const attachmentInputRef = useRef(null);
  const conversationHolderRef = useRef(null);

  useEffect(() => {
    if (selectedSection !== "messages" || !conversationHolderRef.current) {
      return;
    }

    const holder = conversationHolderRef.current;
    holder.scrollTop = holder.scrollHeight;
  }, [orderedMessages, selectedSection]);

  async function reloadAccount() {
    if (!token) {
      return;
    }

    setIsLoading(true);
    try {
      const [accountData, onboardingData] = await Promise.all([
        api.getMyAccount(token),
        api.getOnboardingStatus(token)
      ]);
      setAccount(accountData);
      setOnboarding(onboardingData);
      setMessageStatus("");
    } catch (error) {
      setMessageStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const { isLive } = useDashboardRealtime({
    token,
    enabled: Boolean(token),
    onPoll: reloadAccount,
    handlers: {
      loan_status_updated: () => setRefreshTick((current) => current + 1),
      payment_update: () => setRefreshTick((current) => current + 1)
    }
  });

  async function openDocument(document) {
    try {
      const response = await fetch(
        `${secureFileBase}/api/user/my-account/files/${currentApplicationId}/${document.field}/${document.index}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error("Unable to open document");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      setMessageStatus(error.message);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    setMessageStatus("");

    try {
      const formData = new FormData();
      formData.append("body", messageBody);
      if (currentApplicationId) {
        formData.append("applicationId", currentApplicationId);
      }
      messageAttachments.forEach((file) => {
        formData.append("attachments", file);
      });

      await api.sendMyAccountMessage(token, formData);
      setMessageBody("");
      setMessageAttachments([]);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      setMessageStatus("Message sent to Alesun Fund.");
      await reloadAccount();
    } catch (error) {
      setMessageStatus(error.message);
    }
  }

  async function openMessageAttachment(messageId, index) {
    try {
      const response = await fetch(
        `${secureFileBase}/api/user/my-account/message-files/${messageId}/${index}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error("Unable to open attachment");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      setMessageStatus(error.message);
    }
  }

  function renderWorkspace() {
    switch (selectedSection) {
      case "accountDetails":
        return (
          <div className="stack">
            <div className="pageHeader">
              <div>
                <p className="eyebrow">Borrower control center</p>
                <h2>Account Details</h2>
                <p className="headerMeta">{user.fullName} • {user.email}</p>
              </div>
              <StatusBadge value={account.summary.statusBadge} />
            </div>
            <div className="borrowerOverviewScoreCard">
              <div>
                <p className="eyebrow">Borrower score</p>
                <h3>{account.borrowerScore?.score ?? 0}</h3>
                <p className="headerMeta">{account.borrowerScore?.label || "Current borrower standing"}</p>
              </div>
            </div>
            <div className="metricsGrid borrowerSummaryGrid">
              <SummaryMetric
                label="Active loan amount"
                value={account.activeLoan ? formatCurrency(account.summary.activeLoanAmount) : "No active loan"}
                hint="Your current live facility"
              />
              <SummaryMetric
                label="Next payment due"
                value={
                  account.summary.nextPaymentDue
                    ? `${formatCurrency(account.summary.nextPaymentDue.amount)} • ${formatDate(account.summary.nextPaymentDue.date)}`
                    : "No payment due"
                }
                hint="Most important next action"
              />
              <SummaryMetric
                label="Loan status"
                value={account.summary.statusLabel}
                hint="Based on your latest repayment position"
              />
              <SummaryMetric
                label="Eligibility"
                value={account.summary.eligibilityStatus}
                hint="Your current future-loan position"
              />
            </div>
            {onboarding && (
              <div className="card insetCard">
                <button
                  type="button"
                  className={`sectionToggle ${showMyProfile ? "open" : ""}`}
                  onClick={() => setShowMyProfile((current) => !current)}
                >
                  My Profile
                </button>
                {showMyProfile && (
                  <div className="profilePlaceholder topGap">
                    <div className="profilePlaceholderScroll">
                      <div className="stack compact">
                        <div className="pageHeader">
                          <div>
                            <p className="eyebrow">Verification setup</p>
                            <h3>Onboarding status</h3>
                          </div>
                          <StatusBadge value={onboarding.verificationStatus} />
                        </div>
                        <p><strong>Completion:</strong> {onboarding.completionPercent}%</p>
                        <p><strong>Completed steps:</strong> {onboarding.completedSteps}/3</p>
                        <p><strong>Submitted:</strong> {formatDateTime(onboarding.submittedAt)}</p>
                        <div className="detailGrid">
                          <div className="detailGridRow">
                            <span className="detailLabel">Owner name</span>
                            <span className="detailValue">{onboarding.ownerInfo?.fullName || "Not provided"}</span>
                          </div>
                          <div className="detailGridRow">
                            <span className="detailLabel">Phone number</span>
                            <span className="detailValue">{onboarding.ownerInfo?.phone || "Not provided"}</span>
                          </div>
                          <div className="detailGridRow">
                            <span className="detailLabel">Position in business</span>
                            <span className="detailValue">{onboarding.ownerInfo?.position || "Not provided"}</span>
                          </div>
                          <div className="detailGridRow">
                            <span className="detailLabel">Business name</span>
                            <span className="detailValue">{onboarding.businessInfo?.businessName || "Not provided"}</span>
                          </div>
                          <div className="detailGridRow">
                            <span className="detailLabel">Business location</span>
                            <span className="detailValue">{onboarding.businessInfo?.location || "Not provided"}</span>
                          </div>
                          <div className="detailGridRow">
                            <span className="detailLabel">Industry</span>
                            <span className="detailValue">{onboarding.businessInfo?.industry || "Not provided"}</span>
                          </div>
                        </div>
                        <div className="buttonRow">
                          {!onboarding.onboardingComplete ? (
                            <Link className="buttonLink" to="/onboarding">
                              Continue onboarding
                            </Link>
                          ) : (
                            <Link className="buttonLink" to="/apply">
                              Continue to loan requests
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>Loan Details</h2>
              <p className="headerMeta">Your active loan, upcoming payment, and eligibility in one place.</p>
            </div>
            <div className="stack compact">
              <div className="card insetCard">
                <h3>Active loan details</h3>
                {account.activeLoan ? (
                  <div className="stack compact">
                    <div className="detailGrid borrowerDetailGrid">
                      <div className="detailGridRow">
                        <span className="detailLabel">Loan amount</span>
                        <strong className="detailValue">{formatCurrency(account.activeLoan.principalAmount)}</strong>
                      </div>
                      <div className="detailGridRow">
                        <span className="detailLabel">Processing fee</span>
                        <strong className="detailValue">{formatCurrency(account.activeLoan.processingFee)}</strong>
                      </div>
                      <div className="detailGridRow">
                        <span className="detailLabel">Amount received</span>
                        <strong className="detailValue">{formatCurrency(account.activeLoan.disbursedAmount)}</strong>
                      </div>
                      <div className="detailGridRow">
                        <span className="detailLabel">Loan term</span>
                        <strong className="detailValue">{account.activeLoan.loanTerm}</strong>
                      </div>
                      <div className="detailGridRow">
                        <span className="detailLabel">Interest (1 month)</span>
                        <strong className="detailValue">{formatCurrency(account.activeLoan.interestAmount)}</strong>
                      </div>
                      <div className="detailGridRow">
                        <span className="detailLabel">Total repayable</span>
                        <strong className="detailValue">{formatCurrency(account.activeLoan.totalRepayableAmount)}</strong>
                      </div>
                      <div className="detailGridRow">
                        <span className="detailLabel">Start date</span>
                        <strong className="detailValue">{formatDate(account.activeLoan.startDate)}</strong>
                      </div>
                      <div className="detailGridRow">
                        <span className="detailLabel">Due date</span>
                        <strong className="detailValue">{formatDate(account.activeLoan.dueDate)}</strong>
                      </div>
                      <div className="detailGridRow">
                        <span className="detailLabel">Total paid</span>
                        <strong className="detailValue">{formatCurrency(account.activeLoan.totalPaid)}</strong>
                      </div>
                      <div className="detailGridRow">
                        <span className="detailLabel">Remaining balance</span>
                        <strong className="detailValue">{formatCurrency(account.activeLoan.remainingBalance)}</strong>
                      </div>
                    </div>
                    <div className="progressBlock">
                      <div className="barRow">
                        <span>Repayment progress</span>
                        <strong>{account.activeLoan.progressPercent}%</strong>
                      </div>
                      <div className="progressTrack">
                        <div className="progressFill" style={{ width: `${account.activeLoan.progressPercent}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="infoText">No active loan.</p>
                )}
              </div>

              <div className="card insetCard">
                <h3>Upcoming payment</h3>
                {account.repayments.upcomingPayment ? (
                  <div className="stack compact">
                    <p><strong>Amount:</strong> {formatCurrency(account.repayments.upcomingPayment.amount)}</p>
                    <p><strong>Due date:</strong> {formatDate(account.repayments.upcomingPayment.dueDate)}</p>
                    <p><strong>Instructions:</strong> {account.repayments.upcomingPayment.instructions}</p>
                    <button
                      type="button"
                      className={`sectionToggle repaymentHistoryToggle topGap${showRepaymentHistory ? " open" : ""}`}
                      onClick={() => setShowRepaymentHistory((current) => !current)}
                    >
                      Repayment history
                    </button>
                    {showRepaymentHistory && (
                      !account.repaymentHistory.length ? (
                        <p className="infoText">No records yet.</p>
                      ) : (
                        <div className="repaymentHistoryHolder">
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
                                {account.repaymentHistory.map((payment) => (
                                  <tr key={payment.id}>
                                    <td>{formatDate(payment.date)}</td>
                                    <td>{formatCurrency(payment.amount)}</td>
                                    <td><StatusBadge value={payment.status} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="infoText">No payment due right now.</p>
                )}
              </div>

              <div className="workflowSplit">
                <div className="card insetCard">
                  <h3>Loan eligibility</h3>
                  <div className="eligibilityPanel">
                    <StatusBadge value={account.eligibility.eligible ? "ELIGIBLE" : "NOT_ELIGIBLE"} />
                    <p><strong>{account.eligibility.statusText}</strong></p>
                    {account.eligibility.eligible ? (
                      <p>Eligible loan amount: {formatCurrency(account.eligibility.eligibleLoanAmount)}</p>
                    ) : (
                      <p>{account.eligibility.message}</p>
                    )}
                    {account.eligibility.reasons?.length ? (
                      <ul className="simpleList">
                        {account.eligibility.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "documents":
        return (
          <div className="stack">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>Documents and Profile</h2>
              <p className="headerMeta">Your business profile and submitted borrower documents.</p>
            </div>
            <div className="workflowSplit">
              <div className="card insetCard">
                <h3>Business info</h3>
                {account.documents.businessInfo ? (
                  <div className="stack compact">
                    <p><strong>Business:</strong> {account.documents.businessInfo.businessName}</p>
                    <p><strong>Industry:</strong> {account.documents.businessInfo.industry}</p>
                    <p><strong>Location:</strong> {account.documents.businessInfo.location}</p>
                    <p><strong>Owner:</strong> {account.documents.businessInfo.ownerName}</p>
                    <p><strong>Phone:</strong> {account.documents.businessInfo.ownerPhone}</p>
                  </div>
                ) : (
                  <p className="infoText">No business profile yet.</p>
                )}
              </div>
              <div className="card insetCard">
                <h3>Submitted documents</h3>
                {!account.documents.files.length ? (
                  <p className="infoText">No documents on file yet.</p>
                ) : (
                  <div className="stack compact">
                    {account.documents.files.map((document) => (
                      <button
                        key={document.id}
                        type="button"
                        className="ghostButton documentButton"
                        onClick={() => openDocument(document)}
                      >
                        <span>{document.label}</span>
                        <strong>{document.fileName}</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "messages":
        return (
          <div className="stack messagingWorkspace">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>Messaging</h2>
              <p className="headerMeta">Send questions to Alesun Fund and review replies.</p>
            </div>
            <div className="card insetCard">
              <h3>Conversation</h3>
              <div ref={conversationHolderRef} className="conversationHolder">
                {!account.messages.length ? (
                  <p className="infoText">No messages yet.</p>
                ) : (
                  <div className="messageThread">
                    {orderedMessages.map((entry) => (
                      <div
                        key={entry.id}
                        className={
                          entry.senderRole === "APPLICANT"
                            ? "messageBubbleRow messageBubbleRowOwn"
                            : "messageBubbleRow"
                        }
                      >
                        <div
                          className={
                            entry.senderRole === "APPLICANT"
                              ? "messageBubble messageBubbleOwn"
                              : "messageBubble"
                          }
                        >
                          <div className="messageBubbleMeta">
                            <strong>{entry.senderRole === "APPLICANT" ? "You" : entry.senderName}</strong>
                            <span>{formatDateTime(entry.createdAt)}</span>
                          </div>
                          <p>{entry.body}</p>
                          {entry.attachments?.length ? (
                            <div className="messageAttachmentList">
                              {entry.attachments.map((attachment, index) => (
                                <button
                                  key={`${entry.id}-${attachment.storedName || attachment.originalName || index}`}
                                  type="button"
                                  className="messageAttachmentChip"
                                  onClick={() => openMessageAttachment(entry.id, index)}
                                >
                                  {attachment.originalName || `Attachment ${index + 1}`}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="card insetCard">
              <h3>New message</h3>
              <form className="messageComposer topGap" onSubmit={handleSendMessage}>
                <label className="messageAttachButton">
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    onChange={(event) => setMessageAttachments(Array.from(event.target.files || []))}
                  />
                  <span>Attach</span>
                </label>
                <textarea
                  className="messageComposerInput"
                  placeholder="Write your message to the Alesun Fund team"
                  value={messageBody}
                  onChange={(event) => setMessageBody(event.target.value)}
                />
                <button type="submit" disabled={!messageBody.trim() && !messageAttachments.length}>
                  Send
                </button>
              </form>
              {messageAttachments.length ? (
                <div className="messageAttachmentDrafts">
                  {messageAttachments.map((file) => (
                    <span key={`${file.name}-${file.size}-${file.lastModified}`} className="messageAttachmentChip draft">
                      {file.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="stack">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>Notifications</h2>
              <p className="headerMeta">Application updates, payment reminders, and system messages.</p>
            </div>
            {!account.notifications.length ? (
              <p className="infoText">No notifications yet.</p>
            ) : (
              <div className="stack compact">
                {account.notifications.map((notification) => (
                  <div key={notification.id} className="messageCard">
                    <div className="barRow">
                      <strong>{notification.title}</strong>
                      <span>{formatDateTime(notification.createdAt)}</span>
                    </div>
                    <p>{notification.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "history":
        return (
          <div className="stack">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>Application History</h2>
              <p className="headerMeta">Your past submissions and their current outcomes.</p>
            </div>
            {!account.applications.length ? (
              <p className="infoText">No records yet.</p>
            ) : (
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
                    {account.applications.map((application) => (
                      <tr key={application.id}>
                        <td>{application.businessName}</td>
                        <td>{formatDate(application.submittedAt)}</td>
                        <td>{formatCurrency(application.amount)}</td>
                        <td><StatusBadge value={application.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  if (!token || !user) {
    return (
      <div className="publicShell">
        <section className="publicHero">
          <div className="card">
            <p className="eyebrow">Borrower dashboard</p>
            <h1>My Account</h1>
            <p>Sign in with your applicant account to view your loan position, repayments, notifications, and documents.</p>
            <div className="buttonRow topGap">
              <Link className="buttonLink" to="/apply">
                Go to applicant portal
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="publicShell">
        <section className="publicHero">
          <div className="card">
            <p>Loading your account...</p>
          </div>
        </section>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="publicShell">
        <section className="publicHero">
          <div className="card stack compact">
            <p className="eyebrow">Borrower dashboard</p>
            <h1>My Account</h1>
            <p>{messageStatus || "We could not load your account right now."}</p>
            <div className="buttonRow">
              <button type="button" onClick={() => reloadAccount()}>
                Try again
              </button>
              <Link className="buttonLink" to="/apply">
                Back to applicant portal
              </Link>
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
        <div className="borrowerWorkspaceLayout">
          <aside className="card borrowerSidePanel">
            <div className="stack compact">
              <div>
                <p className="eyebrow">Borrower control center</p>
                <h1>My Account</h1>
                <p className="headerMeta">{user.fullName}</p>
                <p className="liveStatusText">
                  <span className={`liveStatusDot${isLive ? " connected" : ""}`} />
                  {isLive ? "Live updates active" : "Live updates reconnecting"}
                </p>
                {onboarding?.verificationStatus && (
                  <div className="topGap">
                    <StatusBadge value={onboarding.verificationStatus} />
                  </div>
                )}
              </div>
              <div className="borrowerButtonList">
                {sectionNavItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`borrowerNavButton${selectedSection === item.key ? " active" : ""}`}
                    onClick={() => setSelectedSection(item.key)}
                  >
                    {item.key === "overview" && account?.borrowerScore ? (
                      <span className="borrowerNavMeta">
                        Score: {account.borrowerScore.score}
                      </span>
                    ) : null}
                    <span className="borrowerNavLabel">{item.label}</span>
                  </button>
                ))}
              </div>
              {messageStatus && <p className="infoText">{messageStatus}</p>}
            </div>
          </aside>
          <div className="card borrowerEmptyWorkspace">
            <div className="borrowerWorkspaceScroll">
              {renderWorkspace()}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
