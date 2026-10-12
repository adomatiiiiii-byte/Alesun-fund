import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { getDashboardPathForRole } from "../utils/backoffice";

function readApplicantSession() {
  const token = localStorage.getItem("alesun_applicant_token");
  const user = localStorage.getItem("alesun_applicant_user");
  return {
    token,
    user: user ? JSON.parse(user) : null
  };
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const applicantSession = readApplicantSession();
  const token = auth.token || applicantSession.token;
  const user = auth.user || applicantSession.user;
  const isApplicant = user?.role === "APPLICANT";
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(
    () => (isApplicant ? "Change your applicant password" : "Change your back-office password"),
    [isApplicant]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await api.changePassword(token, form);
      if (isApplicant) {
        localStorage.setItem("alesun_applicant_token", response.token);
        localStorage.setItem("alesun_applicant_user", JSON.stringify(response.user));
        navigate("/my-account", { replace: true });
      } else {
        auth.login(response);
        navigate(getDashboardPathForRole(response.user.role), { replace: true });
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="authPage">
      <div className="authPortalShell">
        <section className="authPortalIntro">
          <p className="eyebrow">Password Update</p>
          <h1>{title}</h1>
          <p>You must change this password before you can continue into your dashboard.</p>
        </section>

        <form className="card authCard authPortalForm formGrid" onSubmit={handleSubmit}>
          <div className="authCardHeader">
            <p className="eyebrow">Security Check</p>
            <h2>Change password</h2>
            <p>Enter your current or temporary password, then create a strong new one.</p>
          </div>

          <label className="fieldLabel">
            Current or temporary password
            <input
              type="password"
              value={form.currentPassword}
              onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
            />
          </label>

          <label className="fieldLabel">
            New password
            <input
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
            />
          </label>

          <label className="fieldLabel">
            Confirm password
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
          </label>

          {message ? <p className="errorText">{message}</p> : null}

          <button type="submit" disabled={isSubmitting || !token}>
            {isSubmitting ? "Updating..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
