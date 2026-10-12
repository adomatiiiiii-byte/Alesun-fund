const bcrypt = require("bcryptjs");
const prisma = require("../backend/src/prisma");

function generateTemporaryPassword() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Alesun!${suffix}`;
}

function buildAgentLoginEmail(agentCode) {
  return `${String(agentCode || "").toLowerCase()}@agents.alesunfund.local`;
}

async function createAudit(action, entityId, metadata = {}) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType: "AGENT",
      entityId,
      performedBy: "SYSTEM",
      role: "SYSTEM",
      metadata
    }
  }).catch(() => {});
}

async function main() {
  const agents = await prisma.agent.findMany({
    include: {
      user: true
    }
  });

  const summary = {
    agentsChecked: agents.length,
    credentialsCreated: 0,
    credentialsRepaired: 0,
    credentialsAlreadyExisting: 0,
    errors: 0,
    temporaryPasswords: []
  };

  for (const agent of agents) {
    try {
      const preferredLoginId = agent.agentCode;
      const preferredEmail = buildAgentLoginEmail(agent.agentCode);

      if (!agent.user) {
        const temporaryPassword = generateTemporaryPassword();
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        const user = await prisma.user.create({
          data: {
            fullName: agent.fullName,
            email: preferredEmail,
            loginId: preferredLoginId,
            passwordHash,
            role: "AGENT",
            status: "ACTIVE",
            isActive: true,
            mustChangePassword: true,
            country: agent.country,
            region: agent.region,
            subregion: agent.subregion,
            district: agent.district,
            administrativeUnit: agent.administrativeUnit,
            subUnit: agent.subUnit,
            county: agent.county,
            subcounty: agent.subcounty
          }
        });

        await prisma.agent.update({
          where: { id: agent.id },
          data: { userId: user.id }
        });

        await createAudit("AGENT_AUTH_ACCOUNT_CREATED", agent.id, {
          agentId: agent.id,
          loginId: preferredLoginId
        });

        summary.credentialsCreated += 1;
        summary.temporaryPasswords.push({
          agentId: agent.id,
          agentCode: agent.agentCode,
          fullName: agent.fullName,
          loginId: preferredLoginId,
          temporaryPassword
        });
        continue;
      }

      const updates = {};
      let repaired = false;

      if (agent.user.role !== "AGENT") {
        updates.role = "AGENT";
        repaired = true;
      }

      if (agent.user.status !== "ACTIVE") {
        updates.status = "ACTIVE";
        updates.isActive = true;
        repaired = true;
      }

      if (!agent.user.loginId) {
        updates.loginId = preferredLoginId;
        repaired = true;
      }

      if (!agent.user.email) {
        updates.email = preferredEmail;
        repaired = true;
      }

      if (!agent.user.passwordHash) {
        const temporaryPassword = generateTemporaryPassword();
        updates.passwordHash = await bcrypt.hash(temporaryPassword, 10);
        updates.mustChangePassword = true;
        repaired = true;
        summary.temporaryPasswords.push({
          agentId: agent.id,
          agentCode: agent.agentCode,
          fullName: agent.fullName,
          loginId: agent.user.loginId || preferredLoginId,
          temporaryPassword
        });
      }

      if (repaired) {
        await prisma.user.update({
          where: { id: agent.user.id },
          data: updates
        });
        await createAudit("AGENT_AUTH_ACCOUNT_REPAIRED", agent.id, {
          agentId: agent.id,
          userId: agent.user.id,
          updates: Object.keys(updates)
        });
        summary.credentialsRepaired += 1;
      } else {
        summary.credentialsAlreadyExisting += 1;
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`Failed repairing agent ${agent.id}:`, error.message);
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
