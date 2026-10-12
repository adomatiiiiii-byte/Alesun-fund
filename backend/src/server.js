const http = require("http");
const app = require("./app");
const prisma = require("./prisma");
const { port } = require("./config");
const { startReconciliationScheduler } = require("./services/reconciliationScheduler");
const { initDashboardRealtime } = require("./services/dashboardRealtime.service");
const { initGeoRealtime } = require("./services/geoRealtime.service");

async function start() {
  await prisma.$connect();
  startReconciliationScheduler(prisma);
  const server = http.createServer(app);
  initDashboardRealtime(server);
  initGeoRealtime(server);
  server.listen(port, () => {
    console.log(`Alesun backend listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
