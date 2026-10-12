const {
  apiRequest,
  approveOnboarding,
  assert,
  buildFakeApplicantPayload,
  finalizeOnboardingInDatabase,
  maybeRandomDelay,
  withBearer
} = require("./helpers");

async function simulateSingleUser(context, index) {
  const payload = buildFakeApplicantPayload(context, index);

  const registerResponse = await apiRequest(context, {
    method: "POST",
    url: "/api/public/auth/register",
    data: payload.credentials
  });
  assert(registerResponse.status === 201, "Applicant registration failed", {
    index,
    status: registerResponse.status,
    body: registerResponse.data
  });

  const token = registerResponse.data.token;
  const userId = registerResponse.data.user.id;

  await maybeRandomDelay(context);
  const ownerResponse = await apiRequest(context, {
    method: "POST",
    url: "/api/onboarding/step1",
    headers: withBearer(token),
    data: payload.step1
  });
  assert(ownerResponse.status === 200, "Onboarding step 1 failed", {
    userId,
    status: ownerResponse.status,
    body: ownerResponse.data
  });

  await maybeRandomDelay(context);
  const businessResponse = await apiRequest(context, {
    method: "POST",
    url: "/api/onboarding/step2",
    headers: withBearer(token),
    data: payload.step2
  });
  assert(businessResponse.status === 200, "Onboarding step 2 failed", {
    userId,
    status: businessResponse.status,
    body: businessResponse.data
  });

  await finalizeOnboardingInDatabase(context, userId);
  await approveOnboarding(context, userId);

  if (index === 1) {
    const invalidAmounts = [
      { amount: 0, expectedStatus: 400, label: "zero amount" },
      { amount: -1000, expectedStatus: 400, label: "negative amount" },
      { amount: 999999999, expectedStatus: 400, label: "extremely large amount" }
    ];

    for (const invalidCase of invalidAmounts) {
      const invalidResponse = await apiRequest(context, {
        method: "POST",
        url: "/api/user/loan-request",
        headers: withBearer(token),
        data: {
          amount: invalidCase.amount,
          pricingAccepted: true
        }
      });

      assert(invalidResponse.status === invalidCase.expectedStatus, `Loan request ${invalidCase.label} should be rejected`, {
        userId,
        amount: invalidCase.amount,
        status: invalidResponse.status,
        body: invalidResponse.data
      });
    }
  }

  await maybeRandomDelay(context);
  const loanRequestResponse = await apiRequest(context, {
    method: "POST",
    url: "/api/user/loan-request",
    headers: withBearer(token),
    data: payload.loanRequest
  });
  assert(loanRequestResponse.status === 201, "Loan request creation failed", {
    userId,
    status: loanRequestResponse.status,
    body: loanRequestResponse.data
  });

  context.metrics.totalUsersCreated += 1;

  return {
    index,
    userId,
    token,
    email: payload.credentials.email,
    password: payload.credentials.password,
    loanRequestId: loanRequestResponse.data.loanRequest.id,
    requestedAmount: payload.loanRequest.amount
  };
}

async function runUserSimulation(context) {
  context.logger.info("Starting user simulation", { userCount: context.config.userCount });
  const users = [];
  const batchSize = Math.min(10, context.config.userCount);

  for (let start = 1; start <= context.config.userCount; start += batchSize) {
    const batchIndexes = Array.from(
      { length: Math.min(batchSize, context.config.userCount - start + 1) },
      (_, offset) => start + offset
    );

    const batchResults = await Promise.all(
      batchIndexes.map(async (index) => {
        try {
          return await simulateSingleUser(context, index);
        } catch (error) {
          context.metrics.errors.push({
            scope: "userSimulation",
            index,
            message: error.message,
            details: error.details || null
          });
          context.logger.error("User simulation failed", {
            index,
            error: error.message,
            details: error.details || null
          });
          return null;
        }
      })
    );

    users.push(...batchResults.filter(Boolean));
  }

  assert(users.length > 0, "No stress users were created successfully");
  context.logger.info("User simulation complete", {
    totalCreated: users.length,
    failed: context.config.userCount - users.length
  });

  return {
    users,
    summary: {
      requestedUsers: context.config.userCount,
      completedUsers: users.length,
      failedUsers: context.config.userCount - users.length
    }
  };
}

module.exports = {
  runUserSimulation
};
