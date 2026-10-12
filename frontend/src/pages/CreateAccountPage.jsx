import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";

const emptyForm = {
  fullName: "",
  loginId: "",
  password: "",
  role: "RISK_ADMIN",
  email: ""
};

const emptyResetForm = {
  accountType: "BACKOFFICE",
  accountId: "",
  newTemporaryPassword: "",
  reason: ""
};

export function CreateAccountPage() {
  const { token } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [resetForm, setResetForm] = useState(emptyResetForm);
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const payload = {
        fullName: form.fullName,
        loginId: form.loginId,
        password: form.password,
        role: form.role,
        email: form.email || undefined
      };

      const response = await api.createBackofficeAccount(token, payload);
      setMessage(`Admin account created for ${response.role.replaceAll("_", " ")}.`);
      setForm(emptyForm);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleManualReset(event) {
    event.preventDefault();
    try {
      const response = await api.manualPasswordReset(token, resetForm);
      setMessage(response.message || "Temporary password created. The account holder must change it on next login.");
      setResetForm(emptyResetForm);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Create Account</p>
          <h2>Create admin access</h2>
          <p className="pageIntro">
            Super Admin can provision only Risk Admin and Finance Admin accounts from this screen.
          </p>
        </div>
      </section>
      {message ? <p className="infoText">{message}</p> : null}
      <form className="card formGrid" onSubmit={handleSubmit}>
        <input
          placeholder="Full Name"
          value={form.fullName}
          onChange={(event) => setForm({ ...form, fullName: event.target.value })}
        />
        <input
          placeholder="Login ID"
          value={form.loginId}
          onChange={(event) => setForm({ ...form, loginId: event.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="RISK_ADMIN">Risk Admin</option>
          <option value="FINANCE_ADMIN">Finance Admin</option>
        </select>
        <input
          placeholder="Email (optional)"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />

        <div className="buttonRow">
          <button type="submit">Create Admin Account</button>
        </div>
      </form>

      <form className="card formGrid" onSubmit={handleManualReset}>
        <div className="pageHeader">
          <div>
            <p className="eyebrow">Manual Password Reset</p>
            <h2>Controlled recovery</h2>
            <p className="pageIntro">
              Use this when an admin, agent, investor, or user cannot complete self-service recovery.
            </p>
          </div>
        </div>
        <select value={resetForm.accountType} onChange={(event) => setResetForm({ ...resetForm, accountType: event.target.value })}>
          <option value="BACKOFFICE">Back-office account</option>
          <option value="AGENT">Agent profile</option>
          <option value="INVESTOR">Investor profile</option>
          <option value="USER">User account</option>
        </select>
        <input
          placeholder="Account ID"
          value={resetForm.accountId}
          onChange={(event) => setResetForm({ ...resetForm, accountId: event.target.value })}
        />
        <input
          type="password"
          placeholder="Temporary password"
          value={resetForm.newTemporaryPassword}
          onChange={(event) => setResetForm({ ...resetForm, newTemporaryPassword: event.target.value })}
        />
        <textarea
          placeholder="Reason for reset"
          value={resetForm.reason}
          onChange={(event) => setResetForm({ ...resetForm, reason: event.target.value })}
        />
        <div className="buttonRow">
          <button type="submit">Reset Password</button>
        </div>
      </form>
    </div>
  );
}
