import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";

export function ForgotPasswordPage() {
  const location = useLocation();
  const portal = useMemo(() => (location.pathname.startsWith("/admin") ? "admin" : "applicant"), [location.pathname]);
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await api.forgotPassword({ identifier });
      setMessage(response.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginPath = portal === "admin" ? "/admin/login" : "/login";

  return (
    <div className="authPage">
      <div className="authPortalShell">
        <section className="authPortalIntro">
          <p className="eyebrow">Account Recovery</p>
          <h1>Forgot your password?</h1>
          <p>Enter your registered email, phone number, or Login ID. If an account matches, reset instructions will be sent.</p>
        </section>

        <form className="card authCard authPortalForm formGrid" onSubmit={handleSubmit}>
          <div className="authCardHeader">
            <p className="eyebrow">Reset Access</p>
            <h2>Request password reset</h2>
            <p>If an account matches the details provided, password reset instructions will be sent.</p>
          </div>

          <label className="fieldLabel">
            Email, phone, or Login ID
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter your email, phone, or Login ID"
            />
          </label>

          {message ? <p className="infoText">{message}</p> : null}

          <button type="submit" disabled={isSubmitting || !identifier.trim()}>
            {isSubmitting ? "Submitting..." : "Send reset instructions"}
          </button>

          <p className="authPortalSwitch">
            Remembered it? <Link to={loginPath}>Back to login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
