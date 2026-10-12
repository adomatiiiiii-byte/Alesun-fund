CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Role" AS ENUM ('APPLICANT', 'ADMIN', 'CREDIT_OFFICER', 'FIELD_OFFICER');
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "ApplicationSource" AS ENUM ('PUBLIC', 'INTERNAL');
CREATE TYPE "LoanStatus" AS ENUM ('APPROVED', 'DISBURSED', 'WARNING', 'CLOSED', 'DEFAULTED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PAID_LATE', 'LATE', 'DEFAULTED');

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Business" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "yearsInOperation" NUMERIC(6,2) NOT NULL,
  "ownerName" TEXT NOT NULL,
  "ownerPhone" TEXT NOT NULL,
  "idNumber" TEXT NOT NULL,
  "ownerReliabilityScore" INTEGER NOT NULL,
  "averageMonthlyRevenue" NUMERIC(14,2) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "LoanApplication" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "businessId" UUID NOT NULL REFERENCES "Business"("id"),
  "submittedById" UUID REFERENCES "User"("id"),
  "fieldOfficerId" UUID REFERENCES "User"("id"),
  "source" "ApplicationSource" NOT NULL,
  "status" "ApplicationStatus" NOT NULL,
  "monthlyRevenue" JSONB NOT NULL,
  "monthlyExpenses" JSONB NULL,
  "expenses" NUMERIC(14,2) NOT NULL,
  "financialInfo" JSONB NOT NULL,
  "documentPaths" JSONB NOT NULL,
  "screeningIssues" JSONB NOT NULL,
  "fraudFlags" JSONB NOT NULL,
  "decisionNotes" TEXT NULL,
  "passportPhotoUrl" TEXT NULL,
  "idFrontUrl" TEXT NULL,
  "idBackUrl" TEXT NULL,
  "termsAccepted" BOOLEAN NOT NULL DEFAULT FALSE,
  "termsAcceptedAt" TIMESTAMP NULL,
  "paymentProofUrl" TEXT NULL,
  "hasPaidFee" BOOLEAN NOT NULL DEFAULT FALSE,
  "hasPaidFeeAt" TIMESTAMP NULL,
  "loanRequestAmount" NUMERIC(14,2) NOT NULL,
  "loanPurpose" TEXT NOT NULL,
  "submittedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "RiskScore" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" UUID NOT NULL UNIQUE REFERENCES "LoanApplication"("id"),
  "score" NUMERIC(5,2) NOT NULL,
  "label" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "breakdown" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Loan" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" UUID NOT NULL UNIQUE REFERENCES "LoanApplication"("id"),
  "principal" NUMERIC(14,2) NOT NULL,
  "annualInterestRate" NUMERIC(5,2) NOT NULL,
  "termMonths" INTEGER NOT NULL,
  "status" "LoanStatus" NOT NULL,
  "disbursedAt" TIMESTAMP NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Payment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "loanId" UUID NOT NULL REFERENCES "Loan"("id"),
  "installmentNumber" INTEGER NOT NULL,
  "dueDate" TIMESTAMP NOT NULL,
  "amountDue" NUMERIC(14,2) NOT NULL,
  "amountPaid" NUMERIC(14,2) NULL,
  "paidDate" TIMESTAMP NULL,
  "status" "PaymentStatus" NOT NULL,
  "lateDays" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "VerificationReport" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" UUID NOT NULL REFERENCES "LoanApplication"("id"),
  "officerId" UUID NOT NULL REFERENCES "User"("id"),
  "businessExists" BOOLEAN NOT NULL,
  "stockMatchesClaims" BOOLEAN NOT NULL,
  "customerActivityVerified" BOOLEAN NOT NULL,
  "ownerInterviewNotes" TEXT NOT NULL,
  "attachments" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "AuditLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "User"("id"),
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
