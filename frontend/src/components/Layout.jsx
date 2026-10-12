import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const navItemsByRole = {
    AGENT: [
      { to: "/admin/agent", label: "Agent Dashboard" },
      { to: "/admin/agent", label: "My Users" },
      { to: "/admin/agent", label: "Earnings" },
      { to: "/admin/agent", label: "Wallet" },
      { to: "/admin/agent", label: "Withdrawals" },
      { to: "/admin/agent", label: "Alerts" }
    ],
    INVESTOR: [
      { to: "/admin/investor", label: "Investor Dashboard" },
      { to: "/admin/investor", label: "Executive KPIs" },
      { to: "/admin/investor", label: "Investor Map" },
      { to: "/admin/investor", label: "Portfolio Reports" }
    ],
    FINANCE_ADMIN: [
      { to: "/admin/finance", label: "Finance Dashboard" },
      { to: "/admin/accounting", label: "Accounting" },
      { to: "/loans", label: "Loans" }
    ],
    RISK_ADMIN: [
      { to: "/admin/risk", label: "Risk Dashboard" },
      { to: "/users", label: "Users" },
      { to: "/loans", label: "Loan Applications" },
      { to: "/admin/agents", label: "Agents" }
    ],
    SUPER_ADMIN: [
      { to: "/admin/super", label: "Super Admin" },
      { to: "/admin/super", label: "Executive Dashboard" },
      { to: "/admin/finance", label: "Finance Dashboard" },
      { to: "/admin/risk", label: "Risk Dashboard" },
      { to: "/admin/geo-intelligence", label: "Geo Intelligence" },
      { to: "/admin/create-account", label: "Create Admin Account" },
      { to: "/users", label: "Admin Users" },
      { to: "/admin/super/trail", label: "Admin Trail" },
      { to: "/admin/accounting", label: "System Alerts" },
      { to: "/admin/messages", label: "Messages" },
      { to: "/admin/agents", label: "Agents" },
      { to: "/loans", label: "Loans" }
    ]
  };

  const navItems = navItemsByRole[role] || navItemsByRole.SUPER_ADMIN;
  const dashboardTitles = {
    SUPER_ADMIN: "Super Admin Portal",
    RISK_ADMIN: "Risk Admin Portal",
    FINANCE_ADMIN: "Finance Admin Portal",
    AGENT: "Agent Portal",
    INVESTOR: "Investor Portal"
  };

  async function handleLogout() {
    await logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brandBlock">
          <p className="eyebrow">Alesun Fund</p>
          <h1>{dashboardTitles[role] || "Internal Dashboard"}</h1>
        </div>
        <nav className="nav topNav">
          {navItems.map((item) => (
            <NavLink key={`${item.to}-${item.label}`} to={item.to}>{item.label}</NavLink>
          ))}
        </nav>
        <div className="userCard topbarUserCard">
          <div>
            <strong>{user?.fullName}</strong>
            <span>{user?.role?.replaceAll("_", " ")}</span>
          </div>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="content adminContent">
        <Outlet />
      </main>
    </div>
  );
}
