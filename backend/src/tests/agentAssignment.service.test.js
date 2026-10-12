const { assignAgent } = require("../services/agent.service");

describe("assignAgent", () => {
  it("prefers subcounty, then district, then region matches", async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "agent-district", region: "Central", district: "Wakiso" });

    const prisma = {
      agent: { findFirst }
    };

    const result = await assignAgent(prisma, {
      country: "UGANDA",
      region: "Central",
      subregion: "Buganda South",
      district: "Wakiso",
      administrativeUnit: "Busiro County",
      subUnit: "Kakiri Town Council"
    });

    expect(result.strategy).toBe("DISTRICT_MATCH");
    expect(result.agent.id).toBe("agent-district");
    expect(findFirst).toHaveBeenCalledTimes(2);
  });
});
