# Alesun Fund Internal Dashboard Architecture

## Backend
- Express API with JWT authentication and role-based route protection.
- Prisma/PostgreSQL schema covering users, businesses, applications, risk scores, loans, payments, verifications, and audit logs.
- Transaction-backed state changes for application submission, risk score creation, loan approval, disbursement, payment recording, and verification reporting.

## Frontend
- React + Vite single-page app with guarded routes.
- Core screens for login, portfolio overview, application intake and kanban, SME profile, loan operations, and field verification.
- Local-storage-backed session handling with API-driven data hydration.

## Auditability
- Audit logs are written for application submission, score generation, field assignment, loan approval, disbursement, verification, and payment receipt.
- The risk engine returns weighted breakdowns and surfaced screening issues for transparent underwriting review.
