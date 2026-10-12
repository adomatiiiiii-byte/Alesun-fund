const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { jwtSecret } = require("../config");
const { normalizeRole, resolveLinkedEntityId } = require("./backofficeAuth.service");

let dashboardWss = null;

const ADMIN_REALTIME_ROLES = ["SUPER_ADMIN", "RISK_ADMIN", "FINANCE_ADMIN"];

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

function isAdminRealtimeRole(role) {
  return ADMIN_REALTIME_ROLES.includes(role);
}

function canReceiveUserUpdates(user, userId) {
  return Boolean(userId) && user?.id === userId;
}

function safeSend(socket, payload) {
  if (!socket || socket.readyState !== socket.OPEN) {
    return;
  }

  try {
    socket.send(JSON.stringify(payload));
  } catch (_error) {
    // Ignore send failures on stale sockets.
  }
}

function broadcastDashboardEvent(predicate, payload) {
  if (!dashboardWss) {
    return;
  }

  for (const client of dashboardWss.clients) {
    if (!client.user || client.readyState !== client.OPEN) {
      continue;
    }

    if (!predicate(client.user)) {
      continue;
    }

    safeSend(client, payload);
  }
}

function emitToAdminRoom(type, metadata = {}) {
  broadcastDashboardEvent(
    (user) => isAdminRealtimeRole(user.role),
    {
      type,
      emittedAt: new Date().toISOString(),
      ...metadata
    }
  );
}

function emitToUserRoom(userId, type, metadata = {}) {
  if (!userId) {
    return;
  }

  broadcastDashboardEvent(
    (user) => canReceiveUserUpdates(user, userId),
    {
      type,
      emittedAt: new Date().toISOString(),
      ...metadata
    }
  );
}

function emitLoanRequestCreated({ loanRequestId, userId, amount, status = "PENDING" }) {
  emitToAdminRoom("loan_request_created", {
    loanRequestId,
    userId,
    amount,
    status
  });
}

function emitLoanStatusUpdated({ userId, loanRequestId = null, loanId = null, status, message = null }) {
  emitToUserRoom(userId, "loan_status_updated", {
    loanRequestId,
    loanId,
    status,
    message
  });
}

function emitPaymentUpdate({ userId, loanId, repaymentId, remainingBalance = null, updatedSchedule = null }) {
  const payload = {
    loanId,
    repaymentId,
    remainingBalance,
    updatedSchedule
  };

  emitToUserRoom(userId, "payment_update", payload);
  emitToAdminRoom("payment_update", {
    userId,
    ...payload
  });
}

function emitSystemAlert({ alertId = null, severity = "INFO", message, metadata = {} }) {
  emitToAdminRoom("system_alert", {
    alertId,
    severity,
    message,
    metadata
  });
}

function initDashboardRealtime(server) {
  if (dashboardWss) {
    return dashboardWss;
  }

  dashboardWss = new WebSocketServer({
    server,
    path: "/ws/dashboard"
  });

  dashboardWss.on("connection", async (socket, request) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const token = url.searchParams.get("token");
      if (!token) {
        socket.close(4001, "Authentication required");
        return;
      }

      const user = await hydrateUserFromToken(token);
      if (!user) {
        socket.close(4003, "Forbidden");
        return;
      }

      socket.user = user;
      safeSend(socket, {
        type: "dashboard-connected",
        connectedAt: new Date().toISOString(),
        rooms: [
          canReceiveUserUpdates(user, user.id) ? `user:${user.id}` : null,
          isAdminRealtimeRole(user.role) ? "admin" : null
        ].filter(Boolean)
      });
    } catch (_error) {
      socket.close(4002, "Invalid token");
    }
  });

  return dashboardWss;
}

module.exports = {
  emitLoanRequestCreated,
  emitLoanStatusUpdated,
  emitPaymentUpdate,
  emitSystemAlert,
  initDashboardRealtime
};
