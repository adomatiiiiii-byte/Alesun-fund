const {
  buildApplicationStatusMessage,
  sendApplicationStatusNotification
} = require("../services/notification.service");

describe("application status notifications", () => {
  it("builds the approved template with the applicant name", () => {
    expect(
      buildApplicationStatusMessage({
        status: "APPROVED",
        applicantName: "Sarah"
      })
    ).toBe(
      "Dear Sarah, your loan application with Alesun Fund has been approved. Our team will contact you shortly with next steps."
    );
  });

  it("does not resend a notification for the same status twice", async () => {
    const prismaClient = {
      auditLog: {
        findMany: jest.fn(async () => [{ metadata: { status: "UNDER_REVIEW" } }]),
        create: jest.fn()
      }
    };

    const result = await sendApplicationStatusNotification(
      prismaClient,
      {
        id: "application-1",
        status: "UNDER_REVIEW",
        applicantName: "Sarah"
      },
      { triggeredByUserId: "admin-1" }
    );

    expect(result).toEqual({ sent: false, reason: "duplicate_status" });
    expect(prismaClient.auditLog.create).not.toHaveBeenCalled();
  });
});
