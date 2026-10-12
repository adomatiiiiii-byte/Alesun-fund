import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const portal = params.get("portal") === "admin" ? "admin" : "applicant";
  const loginPath = portal === "admin" ? "/admin/login" : "/login";
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(() => (portal === "admin" ? "Reset back-office password" : "Reset applicant password"), [portal]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      await api.resetPassword({
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword
      });
      navigate(loginPath, {
        replace: true,
        state: { message: "Password reset successful. Please sign in." }
      });
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
          <p className="eyebrow">Password Reset</p>
          <h1>{title}</h1>
          <p>Create a strong new password to restore secure access to your account.</p>
        </section>

        <form className="card authCard authPortalForm formGrid" onSubmit={handleSubmit}>
          <div className="authCardHeader">
            <p className="eyebrow">Reset Access</p>
            <h2>Create new password</h2>
            <p>Password must be at least 8 characters and include at least one letter and one number.</p>
          </div>

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
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>

          <p className="authPortalSwitch">
            Return to <Link to={loginPath}>login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
