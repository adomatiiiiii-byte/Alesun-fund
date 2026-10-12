import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api";

export function BorrowerTopNav() {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem("alesun_applicant_token"));

  async function handleLogout() {
    const token = localStorage.getItem("alesun_applicant_token");
    if (token) {
      await api.applicantLogout(token).catch(() => {});
    }
    localStorage.removeItem("alesun_applicant_token");
    localStorage.removeItem("alesun_applicant_user");
    navigate("/login", {
      replace: true
    });
  }

  return (
    <header className="borrowerTopNav">
      <div className="borrowerTopNavInner">
        <NavLink className={({ isActive }) => `borrowerTopNavButton${isActive ? " active" : ""}`} to="/my-account">
          My Account
        </NavLink>
        <NavLink className={({ isActive }) => `borrowerTopNavButton${isActive ? " active" : ""}`} to="/apply">
          Apply for a Loan
        </NavLink>
        <NavLink className={({ isActive }) => `borrowerTopNavButton${isActive ? " active" : ""}`} to="/agent/dashboard">
          Agent Dashboard
        </NavLink>
        {isLoggedIn && (
          <button type="button" className="borrowerTopNavLogout" onClick={handleLogout}>
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
