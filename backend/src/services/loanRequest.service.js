const { calculateAlesunRiskScore } = require("./riskScoring");
const { getScreeningIssues, getFraudFlags } = require("./applicationAnalysis");
const { buildLoanGeoSnapshot, buildStoredUserLocation } = require("./geography.service");
const { calculateTransparentLoanPricing } = require("./loanPricing.service");
const { getAssignedAgentGeoContext } = require("./agent.service");
const { buildVisibleLoanRequestWhere } = require("./loanRequestLifecycle.service");

function buildSyntheticMonthlyHistory(value) {
  const safeValue = Number(value || 0);
  return Array.from({ length: 6 }, () => safeValue);
}

async function ensureApplicationForLoanRequest(tx, loanRequestId) {
  const loanRequest = await tx.loanRequest.findFirst({
    where: buildVisibleLoanRequestWhere({ id: loanRequestId }),
    include: {
      user: {
        include: {
          userProfile: true,
          businessProfile: true,
          documents: true,
          applications: {
            where: {
              source: "PUBLIC",
              status: "APPROVED"
            },
            include: {
              riskScore: true,
              loan: true
            },
            orderBy: { submittedAt: "desc" }
          }
        }
      }
    }
  });

  if (!loanRequest) {
    const error = new Error("Loan request not found");
    error.statusCode = 404;
    throw error;
  }

  const reusableApplication = loanRequest.user.applications.find((application) => !application.loan);
  if (reusableApplication) {
    return reusableApplication;
  }

  const profile = loanRequest.user.userProfile;
  const businessProfile = loanRequest.user.businessProfile;

  if (!profile || !businessProfile) {
    const error = new Error("Borrower details are incomplete. Review the user record before creating a loan.");
    error.statusCode = 400;
    throw error;
  }

  const monthlyRevenue = buildSyntheticMonthlyHistory(Number(businessProfile.weeklyRevenue || 0) * 4);
  const monthlyExpenses = buildSyntheticMonthlyHistory(Number(businessProfile.weeklyExpenses || 0) * 4);
  const financialInfo = {
    cashAtBank: 0,
    outstandingDebt: 0
  };
  const documentPaths = {
    businessPhotos: [],
    idDocument: [],
    financialRecords: businessProfile ? [{
      storedName: loanRequest.user.documents?.tradingLicenseUrl || null,
      originalName: "Trading license"
    }].filter((item) => item.storedName) : [],
    supportingDocuments: [],
    passportPhoto: null,
    idFrontImage: loanRequest.user.documents?.idFrontUrl
      ? { storedName: loanRequest.user.documents.idFrontUrl, originalName: "ID front image" }
      : null,
    idBackImage: loanRequest.user.documents?.idBackUrl
      ? { storedName: loanRequest.user.documents.idBackUrl, originalName: "ID back image" }
      : null
  };

  const analysisPayload = {
    businessName: businessProfile.name,
    industry: businessProfile.industry,
    location: businessProfile.location,
    yearsInOperation: Number(businessProfile.yearsInOperation || 0),
    monthlyRevenue,
    monthlyExpenses,
    loanRequestAmount: Number(loanRequest.amount),
    loanPurpose: "Loan request approved through the borrower account workflow.",
    ownerName: profile.fullName,
    ownerPhone: profile.phone,
    idNumber: profile.nin,
    financialInfo,
    documents: documentPaths
  };
  const averageExpenses = monthlyExpenses.reduce((sum, value) => sum + value, 0) / monthlyExpenses.length;
  const scoring = calculateAlesunRiskScore({
    ...analysisPayload,
    expenses: averageExpenses,
    ownerReliabilityScore: 80
  });
  const screeningIssues = getScreeningIssues(analysisPayload);
  const fraudFlags = getFraudFlags(analysisPayload);

  const application = await tx.loanApplication.create({
    data: {
      businessId: businessProfile.id,
      submittedById: loanRequest.userId,
      applicantName: profile.fullName,
      phoneNumber: profile.phone,
      email: loanRequest.user.email,
      source: "PUBLIC",
      status: "APPROVED",
      monthlyRevenue,
      monthlyExpenses,
      expenses: averageExpenses,
      financialInfo,
      documentPaths,
      screeningIssues,
      fraudFlags,
      passportPhotoUrl: null,
      idFrontUrl: loanRequest.user.documents?.idFrontUrl || null,
      idBackUrl: loanRequest.user.documents?.idBackUrl || null,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      loanRequestAmount: loanRequest.amount,
      loanPurpose: analysisPayload.loanPurpose,
      decisionNotes: "Application snapshot recreated from verified borrower records for approved loan request."
    }
  });

  await tx.riskScore.create({
    data: {
      applicationId: application.id,
      score: scoring.score,
      label: scoring.label,
      recommendation: scoring.recommendation,
      breakdown: scoring.breakdown
    }
  });

  return tx.loanApplication.findUnique({
    where: { id: application.id },
    include: { riskScore: true, loan: true }
  });
}

async function createLoanFromLoanRequest(tx, { loanRequestId, principal, annualInterestRate, termDays }) {
  const application = await ensureApplicationForLoanRequest(tx, loanRequestId);

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }

  if (!application.riskScore) {
    const error = new Error("No loan should be approved without a risk score");
    error.statusCode = 400;
    throw error;
  }

  if (application.status !== "APPROVED") {
    const error = new Error("Application must be approved by an administrator before creating a loan");
    error.statusCode = 400;
    throw error;
  }

  const existingLoan = await tx.loan.findUnique({
    where: { applicationId: application.id }
  });
  if (existingLoan) {
    const error = new Error("Application already has a loan");
    error.statusCode = 400;
    throw error;
  }

  const activeLoan = await tx.loan.findFirst({
    where: {
      userId: application.submittedById || null,
      status: "ACTIVE"
    }
  });
  if (activeLoan) {
    const error = new Error("Borrower already has an active loan");
    error.statusCode = 400;
    throw error;
  }

  const loanRequestRecord = await tx.loanRequest.findFirst({
    where: buildVisibleLoanRequestWhere({ id: loanRequestId }),
    include: {
      agent: true,
      user: {
        select: {
          id: true,
          country: true,
          region: true,
          subregion: true,
          district: true,
          administrativeUnit: true,
          subUnit: true,
          county: true,
          subcounty: true,
          village: true
        }
      }
    }
  });

  const geoContext = application.submittedById
    ? await getAssignedAgentGeoContext(tx, application.submittedById)
    : null;

  const effectiveAgent = (
    loanRequestRecord?.agent?.status === "ACTIVE"
      ? loanRequestRecord.agent
      : geoContext?.agent
  ) || null;
  if (!effectiveAgent) {
    const error = new Error("Borrower must be assigned to an agent with a verified Uganda location before a loan can be created");
    error.statusCode = 400;
    throw error;
  }

  const storedUserLocation = loanRequestRecord
    ? buildStoredUserLocation(loanRequestRecord)
    : buildStoredUserLocation(geoContext?.userLocation);
  const loanLocation = {
    country: storedUserLocation.country,
    region: storedUserLocation.region,
    subregion: storedUserLocation.subregion,
    district: storedUserLocation.district,
    administrativeUnit: storedUserLocation.administrativeUnit,
    subUnit: storedUserLocation.subUnit,
    county: storedUserLocation.subregion,
    subcounty: storedUserLocation.subcounty || storedUserLocation.subUnit,
    village: storedUserLocation.village
  };

  const pricing = calculateTransparentLoanPricing(principal);

  const loan = await tx.loan.create({
    data: {
      applicationId: application.id,
      userId: application.submittedById || null,
      agentId: effectiveAgent.id,
      country: loanLocation.country,
      region: loanLocation.region,
      subregion: loanLocation.subregion,
      district: loanLocation.district,
      administrativeUnit: loanLocation.administrativeUnit,
      subUnit: loanLocation.subUnit,
      county: loanLocation.subregion,
      subcounty: loanLocation.subcounty,
      geoSnapshot: buildLoanGeoSnapshot({
        userLocation: storedUserLocation,
        agentLocation: {
          country: effectiveAgent.country,
          region: effectiveAgent.region,
          subregion: effectiveAgent.subregion,
          district: effectiveAgent.district,
          administrativeUnit: effectiveAgent.administrativeUnit,
          subUnit: effectiveAgent.subUnit,
          county: effectiveAgent.subregion,
          subcounty: effectiveAgent.subcounty
        },
        loanLocation
      }),
      principal: pricing.principalAmount,
      principalAmount: pricing.principalAmount,
      processingFee: pricing.processingFee,
      disbursedAmount: pricing.disbursedAmount,
      interestAmount: pricing.interestAmount,
      totalRepayableAmount: pricing.totalRepayableAmount,
      loanTerm: pricing.loanTerm,
      remainingBalance: pricing.totalRepayableAmount,
      annualInterestRate: pricing.annualInterestRate,
      termMonths: pricing.termDays,
      status: "ACTIVE"
    }
  });

  if (application.submittedById) {
    await tx.user.update({
      where: { id: application.submittedById },
      data: {
        totalLoansTaken: {
          increment: 1
        }
      }
    });
  }

  const loanRequest = await tx.loanRequest.update({
    where: { id: loanRequestId },
    data: { status: "APPROVED" },
    include: {
      user: {
        select: { id: true, fullName: true, email: true }
      }
    }
  });

  return {
    application,
    loan,
    loanRequest
  };
}

module.exports = {
  ensureApplicationForLoanRequest,
  createLoanFromLoanRequest
};
