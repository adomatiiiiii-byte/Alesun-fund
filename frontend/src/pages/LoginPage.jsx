import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";
import { getDashboardPathForRole } from "../utils/backoffice";

const portalCopy = {
  applicant: {
    eyebrow: "Applicant Access",
    title: "Alesun Fund applicant login",
    description: "Sign in to continue onboarding, review your borrower dashboard, and submit loan requests once eligible.",
    submitLabel: "Sign in to your account",
    helperLabel: "Need internal team access instead?",
    helperTo: "/admin/login",
    helperLinkLabel: "Open admin portal",
    defaultEmail: "",
    note: "Use the applicant email and password you created during registration."
  },
  admin: {
    eyebrow: "Back-Office Portal",
    title: "Alesun Fund back-office login",
    description: "Super Admins, Risk Admins, Finance Admins, Agents, and Investors all sign in here with their assigned credentials.",
    submitLabel: "Enter back-office portal",
    helperLabel: "Need applicant access instead?",
    helperTo: "/login",
    helperLinkLabel: "Open applicant login",
    defaultLoginId: "admin",
    note: "Use your assigned login ID and password. Access is redirected automatically based on your role."
  },
  staff: {
    eyebrow: "Internal Access",
    title: "Alesun Fund team login",
    description: "Sign in for dashboard access across credit review, field verification, and loan servicing.",
    submitLabel: "Sign in",
    helperLabel: "Need the locked admin-only entrance?",
    helperTo: "/admin/login",
    helperLinkLabel: "Open admin portal",
    defaultLoginId: "credit",
    note: "Staff accounts are seeded locally for development and demos."
  }
};

const portalStats = [
  { label: "Approval orchestration", value: "End-to-end" },
  { label: "Protected sessions", value: "JWT secured" },
  { label: "Review visibility", value: "Live queues" }
];

export function LoginPage({ portal = "staff" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const copy = portalCopy[portal] ?? portalCopy.staff;
  const isApplicantPortal = portal === "applicant";
  const [mode, setMode] = useState(isApplicantPortal ? "login" : "login");
  const [form, setForm] = useState({ email: copy.defaultEmail || "", loginId: copy.defaultLoginId || "", password: portal === "applicant" ? "" : "Password123!" });
  const [signupForm, setSignupForm] = useState({ fullName: "", email: "", password: "" });
  const [message, setMessage] = useState(location.state?.message || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const submittedForm = new FormData(event.currentTarget);
    const submittedLoginId = String(submittedForm.get("loginId") || "").trim();
    const submittedEmail = String(submittedForm.get("email") || "").trim();
    const submittedPassword = String(submittedForm.get("password") || "");

    try {
      if (portal === "applicant" && mode === "signup") {
        const payload = await api.applicantRegister(signupForm);
        localStorage.setItem("alesun_applicant_token", payload.token);
        localStorage.setItem("alesun_applicant_user", JSON.stringify(payload.user));
        navigate("/onboarding", { replace: true });
      } else if (portal === "applicant") {
        const payload = await api.applicantLogin({
          ...form,
          email: submittedEmail || form.email,
          password: submittedPassword || form.password
        });
        localStorage.setItem("alesun_applicant_token", payload.token);
        localStorage.setItem("alesun_applicant_user", JSON.stringify(payload.user));
        if (payload.user?.mustChangePassword) {
          navigate("/change-password", { replace: true });
          return;
        }
        const onboardingStatus = await api.getOnboardingStatus(payload.token);
        navigate(
          onboardingStatus?.onboardingComplete
            ? location.state?.from || "/my-account"
            : "/onboarding",
          { replace: true }
        );
      } else {
        const payload =
          portal === "admin"
              ? await api.adminLogin({
                ...form,
                loginId: submittedLoginId || form.loginId,
                password: submittedPassword || form.password
              })
            : await api.login(form);
        login(payload);
        if (payload.user?.mustChangePassword) {
          navigate("/change-password", { replace: true });
          return;
        }
        navigate(payload.user?.dashboardPath || getDashboardPathForRole(payload.user?.role), { replace: true });
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`authPage authPage-${portal}`}>
      <div className="authPortalShell">
        <section className="authPortalIntro">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
          <div className="authPortalStatGrid">
            {portalStats.map((item) => (
              <article key={item.label} className="authPortalStatCard">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
          <div className="authPortalNote">
            <strong>Local setup note</strong>
            <p>{copy.note}</p>
          </div>
        </section>

        <form className="card authCard authPortalForm formGrid" onSubmit={handleSubmit}>
          <div className="authCardHeader">
            <p className="eyebrow">Secure Sign-In</p>
            <h2>{isApplicantPortal && mode === "signup" ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isApplicantPortal
                ? mode === "signup"
                  ? "Create a new applicant account to access onboarding and loan requests."
                  : "Use your applicant credentials to continue."
                : "Use your assigned credentials to continue."}
            </p>
          </div>

          {isApplicantPortal && (
            <div className="buttonRow authModeRow">
              <button
                type="button"
                className={mode === "login" ? "authModeButton active" : "authModeButton"}
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === "signup" ? "authModeButton active" : "authModeButton"}
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
              >
                Sign up
              </button>
            </div>
          )}

          {isApplicantPortal && mode === "signup" && (
            <label className="fieldLabel">
              Full Name
              <input
                placeholder="Enter your full name"
                type="text"
                value={signupForm.fullName}
                onChange={(event) => setSignupForm({ ...signupForm, fullName: event.target.value })}
              />
            </label>
          )}

          <label className="fieldLabel">
            {portal === "applicant" ? "Email" : "Login ID"}
            <input
              placeholder={portal === "applicant" ? "name@example.com" : "your login ID"}
              type={portal === "applicant" ? "email" : "text"}
              name={portal === "applicant" ? "email" : "loginId"}
              autoComplete={portal === "applicant" ? "email" : "username"}
              value={isApplicantPortal && mode === "signup" ? signupForm.email : (portal === "applicant" ? form.email : form.loginId)}
              onChange={(event) =>
                isApplicantPortal && mode === "signup"
                  ? setSignupForm({ ...signupForm, email: event.target.value })
                  : setForm({ ...form, ...(portal === "applicant" ? { email: event.target.value } : { loginId: event.target.value }) })
              }
            />
          </label>

          <label className="fieldLabel">
            Password
            <input
              placeholder="Enter password"
              type="password"
              name="password"
              autoComplete={isApplicantPortal && mode === "signup" ? "new-password" : "current-password"}
              value={isApplicantPortal && mode === "signup" ? signupForm.password : form.password}
              onChange={(event) =>
                isApplicantPortal && mode === "signup"
                  ? setSignupForm({ ...signupForm, password: event.target.value })
                  : setForm({ ...form, password: event.target.value })
              }
            />
          </label>

          {message && <p className="errorText">{message}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isApplicantPortal && mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : isApplicantPortal && mode === "signup"
                ? "Create applicant account"
                : copy.submitLabel}
          </button>

          <p className="authPortalSwitch">
            <Link to={portal === "admin" ? "/admin/forgot-password" : "/forgot-password"}>Forgot Password?</Link>
          </p>

          <p className="authPortalSwitch">
            {isApplicantPortal && mode === "signup"
              ? "Already have an account? "
              : copy.helperLabel}{" "}
            {isApplicantPortal && mode === "signup" ? (
              <button
                type="button"
                className="inlineLinkButton"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
              >
                Sign in
              </button>
            ) : (
              <Link to={copy.helperTo}>{copy.helperLinkLabel}</Link>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
