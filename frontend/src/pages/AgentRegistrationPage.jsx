import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { BorrowerTopNav } from "../components/BorrowerTopNav";

export function AgentRegistrationPage() {
  const token = localStorage.getItem("alesun_applicant_token");
  const user = localStorage.getItem("alesun_applicant_user")
    ? JSON.parse(localStorage.getItem("alesun_applicant_user"))
    : null;

  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    api.getAgentStatus(token)
      .then((data) => {
        setStatus(data);
        setMessage(data.message || "");
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (!token || !user) {
    return (
      <div className="publicShell borrowerShell">
        <BorrowerTopNav />
        <section className="publicHero borrowerHero">
          <div className="borrowerWorkspaceLayout borrowerWorkspaceLayoutSingle">
            <div className="card borrowerEmptyWorkspace">
              <p className="eyebrow">Agent network</p>
              <h2>Agent Access</h2>
              <p>Sign in with your applicant account first to check whether an administrator has already created your agent access.</p>
              <div className="buttonRow">
                <Link className="buttonLink" to="/login">
                  Go to login
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
            <p className="eyebrow">Agent network</p>
            <h2>Agent Access</h2>
            <p className="headerMeta">Agent accounts are created and activated by Alesun Fund administrators.</p>

            {isLoading ? (
              <p>Loading agent status...</p>
            ) : (
              <div className="stack">
                {message ? <p className="infoText">{message}</p> : null}
                {status?.agent?.agentCode ? (
                  <div className="eligibilityPanel eligibleState">
                    <strong>Your agent account is active.</strong>
                    <p>Agent ID: {status.agent.agentCode}</p>
                    <p>Created by: {status.agent.createdByAdmin?.fullName || "Alesun Fund Admin"}</p>
                  </div>
                ) : (
                  <div className="eligibilityPanel">
                    <strong>Admin-controlled onboarding only</strong>
                    <p>An administrator must create your agent account, assign your KYC details, and issue your login credentials before you can use the agent dashboard.</p>
                    <div className="buttonRow">
                      <Link className="buttonLink" to="/agent/dashboard">
                        Check agent dashboard
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
