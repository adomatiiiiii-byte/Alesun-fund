const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes");
const publicAuthRoutes = require("./routes/publicAuthRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const publicApplicationRoutes = require("./routes/publicApplicationRoutes");
const adminApplicationRoutes = require("./routes/adminApplicationRoutes");
const loanRoutes = require("./routes/loanRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const businessRoutes = require("./routes/businessRoutes");
const auditRoutes = require("./routes/auditRoutes");
const adminAuditTrailRoutes = require("./routes/adminAuditTrailRoutes");
const userRoutes = require("./routes/userRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const accountingRoutes = require("./routes/accountingRoutes");
const agentRoutes = require("./routes/agentRoutes");
const adminAgentRoutes = require("./routes/adminAgentRoutes");
const investorRoutes = require("./routes/investorRoutes");
const geoRoutes = require("./routes/geoRoutes");
const passwordResetAdminRoutes = require("./routes/passwordResetAdminRoutes");
const { recordApiResult } = require("./services/monitoringService");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    recordApiResult({
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });
  next();
});
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/public/auth", publicAuthRoutes);
app.use("/api/public", publicApplicationRoutes);
app.use("/api/admin", adminApplicationRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/verification-reports", verificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/admin/audit-trail", adminAuditTrailRoutes);
app.use("/api/user/agent", agentRoutes);
app.use("/api/user", userRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/accounting", accountingRoutes);
app.use("/api/admin/agents", adminAgentRoutes);
app.use("/api/admin", passwordResetAdminRoutes);
app.use("/api/admin/investor", investorRoutes);
app.use("/api/investor", investorRoutes);
app.use("/api/geo", geoRoutes);

app.use(errorHandler);

module.exports = app;
