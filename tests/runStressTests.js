const { createStressContext, computeResponseStats, disposeStressContext } = require("./stress/helpers");
const { runUserSimulation } = require("./stress/userSimulation");
const { runLoanFlowTest } = require("./stress/loanFlowTest");
const { runRepaymentStressTest } = require("./stress/repaymentStressTest");
const { runConcurrencyTest } = require("./stress/concurrencyTest");
const { runIntegrityChecks } = require("./stress/integrityChecks");

function printUsage() {
  console.log("Usage: node tests/runStressTests.js");
  console.log("Required environment:");
  console.log("  STRESS_TEST_ENABLED=true");
  console.log("  STRESS_TEST_DATABASE_URL=postgresql://.../alesun_fund_stress");
  console.log("Optional:");
  console.log("  STRESS_TEST_BASE_URL=http://localhost:4001");
  console.log("  STRESS_TEST_USER_COUNT=50");
  console.log("  STRESS_TEST_REPAYMENT_CONCURRENCY=12");
  console.log("  STRESS_TEST_RANDOM_DELAY_MS=120");
}

async function main() {
  if (process.argv.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  let context = null;
  try {
    context = await createStressContext();
    const userSimulation = await runUserSimulation(context);
    const loanFlow = await runLoanFlowTest(context, userSimulation);
    const repaymentStress = await runRepaymentStressTest(context, loanFlow);
    const concurrency = await runConcurrencyTest(context, loanFlow);
    const integrity = await runIntegrityChecks(context);
    const performance = computeResponseStats(context.metrics.requests);

    const summary = {
      runId: context.runId,
      totals: {
        usersCreated: context.metrics.totalUsersCreated,
        loansIssued: context.metrics.totalLoansIssued,
        repaymentsMade: context.metrics.totalRepaymentsMade,
        failedTransactions: context.metrics.failedTransactions,
        capturedErrors: context.metrics.errors.length
      },
      userSimulation: userSimulation.summary,
      loanFlow: loanFlow.summary,
      repaymentStress: repaymentStress.summary,
      concurrency: concurrency.summary,
      integrity: integrity.summary,
      performance
    };

    console.log(JSON.stringify(summary, null, 2));

    if (context.metrics.errors.length) {
      console.error("Stress tests completed with captured execution errors.");
      process.exitCode = 1;
    } else {
      console.log("Stress tests completed successfully.");
      process.exitCode = 0;
    }
  } catch (error) {
    console.error("Stress test suite failed.");
    console.error(error.message);
    if (error.details) {
      console.error(JSON.stringify(error.details, null, 2));
    }
    process.exitCode = 1;
  } finally {
    await disposeStressContext(context);
  }
}

main();
