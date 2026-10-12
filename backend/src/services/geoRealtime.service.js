const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");
const { normalizeRole, resolveLinkedEntityId } = require("./backofficeAuth.service");
const { invalidateGeoIntelligenceCache } = require("./geoIntelligence.service");

let geoWss = null;
let flushTimer = null;
let queuedEvents = [];

async function hydrateUserFromToken(token) {
  const payload = jwt.verify(token, jwtSecret);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      loginId: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      status: true
    }
  });

  if (!user || !user.isActive || user.status !== "ACTIVE") {
    return null;
  }

  return {
    ...user,
    role: normalizeRole(user.role),
    linkedEntityId: await resolveLinkedEntityId(prisma, user)
  };
}

function isGeoAuthorized(role) {
  return ["SUPER_ADMIN", "RISK_ADMIN", "FINANCE_ADMIN"].includes(role);
}

function flushGeoEvents() {
  flushTimer = null;
  if (!geoWss || !queuedEvents.length) {
    queuedEvents = [];
    return;
  }

  const payload = JSON.stringify({
    type: "geo-batch-update",
    queuedAt: new Date().toISOString(),
    events: queuedEvents.splice(0)
  });

  for (const client of geoWss.clients) {
    if (client.readyState !== client.OPEN || !client.user || !isGeoAuthorized(client.user.role)) {
      continue;
    }

    try {
      client.send(payload);
    } catch (_error) {
      // Ignore send failures on stale sockets.
    }
  }
}

function queueGeoUpdate(event) {
  invalidateGeoIntelligenceCache();
  queuedEvents.push({
    ...event,
    queuedAt: new Date().toISOString()
  });

  if (!flushTimer) {
    flushTimer = setTimeout(flushGeoEvents, 5000);
  }
}

function scheduleRiskRefresh() {
  queueGeoUpdate({
    type: "risk_refresh"
  });
}

function initGeoRealtime(server) {
  if (geoWss) {
    return geoWss;
  }

  geoWss = new WebSocketServer({
    server,
    path: "/ws/geo-intelligence"
  });

  geoWss.on("connection", async (socket, request) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const token = url.searchParams.get("token");
      if (!token) {
        socket.close(4001, "Authentication required");
        return;
      }

      const user = await hydrateUserFromToken(token);
      if (!user || !isGeoAuthorized(user.role)) {
        socket.close(4003, "Forbidden");
        return;
      }

      socket.user = user;
      socket.send(
        JSON.stringify({
          type: "geo-connected",
          connectedAt: new Date().toISOString()
        })
      );
    } catch (_error) {
      socket.close(4002, "Invalid token");
    }
  });

  // Batch the low-frequency daily risk refresh separately from transactional events.
  setInterval(scheduleRiskRefresh, 24 * 60 * 60 * 1000).unref();

  return geoWss;
}

module.exports = {
  initGeoRealtime,
  queueGeoUpdate,
  scheduleRiskRefresh
};
