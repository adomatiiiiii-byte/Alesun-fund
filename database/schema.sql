CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "Role" AS ENUM ('APPLICANT', 'ADMIN', 'CREDIT_OFFICER', 'FIELD_OFFICER');
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE "ApplicationSource" AS ENUM ('PUBLIC', 'INTERNAL');
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DEFAULTED');
CREATE TYPE "LoanOutcome" AS ENUM ('PERFECT', 'LATE', 'DEFAULT');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PAID_LATE', 'LATE', 'DEFAULTED');
CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "VerificationReviewStatus" AS ENUM ('INCOMPLETE', 'PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "score" INTEGER NOT NULL DEFAULT 100,
  "maxLoanLimit" NUMERIC(14,2) NOT NULL DEFAULT 100000,
  "totalLoansTaken" INTEGER NOT NULL DEFAULT 0,
  "totalLoansCompleted" INTEGER NOT NULL DEFAULT 0,
  "lastLoanStatus" "LoanOutcome",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Business" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID UNIQUE,
  "name" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "location" TEXT NOT NULL DEFAULT '',
  "yearsInOperation" NUMERIC(6,2) NOT NULL,
  "weeklyRevenue" NUMERIC(14,2),
  "weeklyExpenses" NUMERIC(14,2),
  "ownerName" TEXT NOT NULL,
  "ownerPhone" TEXT NOT NULL,
  "idNumber" TEXT NOT NULL DEFAULT '',
  "ownerReliabilityScore" INTEGER NOT NULL,
  "averageMonthlyRevenue" NUMERIC(14,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Business_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "UserProfile" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "nin" TEXT NOT NULL UNIQUE,
  "dateOfBirth" TIMESTAMP(3) NOT NULL,
  "phone" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Document" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  "idFrontUrl" TEXT NOT NULL,
  "idBackUrl" TEXT NOT NULL,
  "tradingLicenseUrl" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "VerificationStatus" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  "status" "VerificationReviewStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "completedSteps" INTEGER NOT NULL DEFAULT 0,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "LoanApplication" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "businessId" UUID NOT NULL,
  "submittedById" UUID,
  "fieldOfficerId" UUID,
  "applicantName" TEXT,
  "phoneNumber" TEXT,
  "email" TEXT,
  "source" "ApplicationSource" NOT NULL DEFAULT 'INTERNAL',
  "status" "ApplicationStatus" NOT NULL,
  "monthlyRevenue" JSONB NOT NULL,
  "monthlyExpenses" JSONB,
  "expenses" NUMERIC(14,2) NOT NULL,
  "financialInfo" JSONB NOT NULL,
  "documentPaths" JSONB NOT NULL,
  "screeningIssues" JSONB NOT NULL,
  "fraudFlags" JSONB NOT NULL DEFAULT '[]',
  "decisionNotes" TEXT,
  "passportPhotoUrl" TEXT,
  "idFrontUrl" TEXT,
  "idBackUrl" TEXT,
  "termsAccepted" BOOLEAN NOT NULL DEFAULT FALSE,
  "termsAcceptedAt" TIMESTAMP(3),
  "paymentProofUrl" TEXT,
  "hasPaidFee" BOOLEAN NOT NULL DEFAULT FALSE,
  "hasPaidFeeAt" TIMESTAMP(3),
  "loanRequestAmount" NUMERIC(14,2) NOT NULL,
  "loanPurpose" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanApplication_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LoanApplication_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LoanApplication_fieldOfficerId_fkey" FOREIGN KEY ("fieldOfficerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "RiskScore" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" UUID NOT NULL UNIQUE,
  "score" NUMERIC(5,2) NOT NULL,
  "label" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "breakdown" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskScore_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Loan" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" UUID NOT NULL UNIQUE,
  "userId" UUID,
  "principal" NUMERIC(14,2) NOT NULL,
  "annualInterestRate" NUMERIC(5,2) NOT NULL,
  "termMonths" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "fullyPaid" BOOLEAN NOT NULL DEFAULT FALSE,
  "daysLate" INTEGER NOT NULL DEFAULT 0,
  "status" "LoanStatus" NOT NULL,
  "disbursedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Loan_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Payment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "loanId" UUID NOT NULL,
  "installmentNumber" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "amountDue" NUMERIC(14,2) NOT NULL,
  "amountPaid" NUMERIC(14,2),
  "paidDate" TIMESTAMP(3),
  "status" "PaymentStatus" NOT NULL,
  "lateDays" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "VerificationReport" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "applicationId" UUID NOT NULL,
  "officerId" UUID NOT NULL,
  "businessExists" BOOLEAN NOT NULL,
  "stockMatchesClaims" BOOLEAN NOT NULL,
  "customerActivityVerified" BOOLEAN NOT NULL,
  "ownerInterviewNotes" TEXT NOT NULL,
  "attachments" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationReport_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LoanApplication" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VerificationReport_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "performedBy" TEXT,
  "role" TEXT,
  "previousValue" JSONB,
  "newValue" JSONB,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "LoanRequest" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "amount" NUMERIC(14,2) NOT NULL,
  "status" "LoanRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoanRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "LoanApplication_status_idx" ON "LoanApplication" ("status");
CREATE INDEX "Loan_status_idx" ON "Loan" ("status");
CREATE INDEX "Payment_loanId_dueDate_idx" ON "Payment" ("loanId", "dueDate");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog" ("timestamp");
