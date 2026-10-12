const { runReconciliation } = require("./reconciliationService");

function startReconciliationScheduler(prismaClient) {
  let cron;
  try {
    cron = require("node-cron");
  } catch (error) {
    console.error("[RECONCILIATION] node-cron is not available; daily reconciliation scheduler not started.", error);
    return null;
  }

  const task = cron.schedule(
    "0 0 * * *",
    () => {
      runReconciliation(prismaClient).catch((error) => {
        console.error("[RECONCILIATION] scheduled run failed", error);
      });
    },
    {
      timezone: "Africa/Nairobi"
    }
  );

  console.log("[RECONCILIATION] Daily reconciliation scheduled for midnight Africa/Nairobi.");
  return task;
}

module.exports = {
  startReconciliationScheduler
};
