const { z } = require("zod");

function parseDecimalValue(value) {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    return Number.NaN;
  }

  return Number.parseFloat(trimmed);
}

const nonNegativeNumberLikeSchema = z
  .union([z.string(), z.number()])
  .refine((value) => value !== "", { message: "Value is required" })
  .transform((value) => parseDecimalValue(value))
  .refine((value) => Number.isFinite(value), { message: "Value must be a valid number" })
  .refine((value) => value >= 0, { message: "Value cannot be negative" });

const positiveNumberLikeSchema = z
  .union([z.string(), z.number()])
  .refine((value) => value !== "", { message: "Value is required" })
  .transform((value) => parseDecimalValue(value))
  .refine((value) => Number.isFinite(value), { message: "Value must be a valid number" })
  .refine((value) => value > 0, { message: "Value must be greater than zero" });

const revenueSchema = z.array(nonNegativeNumberLikeSchema).length(6);

const registerSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["APPLICANT", "ADMIN", "SUPER_ADMIN", "CREDIT_OFFICER", "FIELD_OFFICER", "RISK_ADMIN", "FINANCE_ADMIN", "AGENT", "INVESTOR"]).default("CREDIT_OFFICER")
});

const optionalTrimmedString = () =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return undefined;
      }
      const trimmed = String(value).trim();
      return trimmed.length ? trimmed : undefined;
    },
    z.string().optional()
  );

const loginSchema = z.object({
  email: optionalTrimmedString().pipe(z.string().email().optional()),
  loginId: optionalTrimmedString().pipe(z.string().min(3).optional()),
  password: z.string().min(8)
}).superRefine((value, ctx) => {
  if (!value.email && !value.loginId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Login ID is required",
      path: ["loginId"]
    });
  }
});

const applicationSchema = z.object({
  businessName: z.string().min(2),
  industry: z.string().min(2),
  location: z.string().min(2),
  yearsInOperation: nonNegativeNumberLikeSchema,
  monthlyRevenue: revenueSchema,
  monthlyExpenses: revenueSchema,
  loanRequestAmount: positiveNumberLikeSchema,
  loanPurpose: z.string().min(10),
  ownerName: z.string().min(3),
  ownerPhone: z.string().min(7),
  idNumber: z.string().min(5),
  termsAccepted: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "on")
    .refine((value) => value === true, { message: "Terms and Conditions must be accepted" }),
  ownerReliabilityScore: z.coerce.number().min(0).max(100).optional(),
  financialInfo: z
    .object({
      cashAtBank: nonNegativeNumberLikeSchema.default(0),
      outstandingDebt: nonNegativeNumberLikeSchema.default(0)
    })
    .default({ cashAtBank: 0, outstandingDebt: 0 })
});

const adminApplicationQuerySchema = z.object({
  status: z.enum(["NEW", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
  riskLabel: z.enum(["Low risk", "Medium risk", "High risk"]).optional(),
  source: z.enum(["PUBLIC", "INTERNAL"]).optional(),
  dateFrom: z.string().optional()
});

const adminDecisionSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["APPROVE", "REJECT", "SEND_TO_FIELD_VERIFICATION"]),
  notes: z.string().max(500).optional(),
  fieldOfficerId: z.string().uuid().optional()
});

const adminStatusUpdateSchema = z.object({
  status: z.enum(["NEW", "UNDER_REVIEW", "APPROVED", "REJECTED"])
});

const applicantRegisterSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8)
});

const onboardingStep1Schema = z.object({
  fullName: z.string().min(3),
  nin: z.string().min(5),
  dateOfBirth: z.string().date(),
  phone: z.string().min(7),
  email: z.string().email(),
  address: z.string().min(5),
  position: z.string().min(2),
  agentReferralId: z.string().trim().min(3, "Agent ID is required").max(20),
  country: z.string().min(2).default("Uganda"),
  region: z.string().min(2),
  subregion: z.string().min(2).optional(),
  county: z.string().min(2).optional(),
  district: z.string().min(2),
  administrativeUnit: z.string().trim().optional().default(""),
  subUnit: z.string().trim().optional().default(""),
  subcounty: z.string().trim().optional().default(""),
  village: z.string().trim().max(120).optional().default(""),
  gpsLatitude: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(-90).max(90).optional()
  ),
  gpsLongitude: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(-180).max(180).optional()
  )
}).superRefine((value, ctx) => {
  if (!value.subregion && !value.county) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Subregion or county is required",
      path: ["subregion"]
    });
  }
  if (!value.administrativeUnit && !value.county) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Administrative unit is required",
      path: ["administrativeUnit"]
    });
  }
  if (!value.subUnit && !value.subcounty) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Sub unit is required",
      path: ["subUnit"]
    });
  }
}).transform((value) => ({
  ...value,
  subregion: value.subregion || value.county,
  administrativeUnit: value.administrativeUnit || value.county || "",
  subUnit: value.subUnit || value.subcounty || "",
  county: value.county || value.subregion,
  subcounty: value.subUnit || value.subcounty
}));

const onboardingStep2Schema = z.object({
  businessName: z.string().min(2),
  location: z.string().min(2),
  industry: z.string().min(2),
  yearsInOperation: nonNegativeNumberLikeSchema,
  weeklyRevenue: nonNegativeNumberLikeSchema,
  weeklyExpenses: nonNegativeNumberLikeSchema
});

const onboardingVerificationDecisionSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"])
});

const verificationSchema = z.object({
  applicationId: z.string().uuid(),
  businessExists: z.coerce.boolean(),
  stockMatchesClaims: z.coerce.boolean(),
  customerActivityVerified: z.coerce.boolean(),
  ownerInterviewNotes: z.string().min(10)
});

const loanCreateSchema = z
  .object({
    applicationId: z.string().uuid().optional(),
    loanRequestId: z.string().uuid().optional(),
    principal: z.coerce.number().positive(),
    annualInterestRate: z.coerce.number().min(0).max(100),
    termDays: z.coerce.number().int().min(1).max(365)
  })
  .superRefine((value, ctx) => {
    if (!value.applicationId && !value.loanRequestId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either applicationId or loanRequestId is required",
        path: ["applicationId"]
      });
    }
  });

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: z.string().datetime().optional()
});

const loanRequestCreateSchema = z.object({
  amount: positiveNumberLikeSchema,
  pricingAccepted: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true" || value === "on")
    .refine((value) => value === true, {
      message: "You must accept the 1-month loan pricing terms before submitting"
    })
});

const loanPricingQuerySchema = z.object({
  amount: positiveNumberLikeSchema
});

const loanRequestStatusUpdateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"])
});

const agentApplicationSchema = z.object({
  fullName: z.string().min(3),
  phoneNumber: z.string().min(7),
  nationalId: z.string().min(5),
  kycDetails: z.object({
    address: z.string().min(3).optional().default(""),
    notes: z.string().max(500).optional().default("")
  }).default({ address: "", notes: "" })
});

const agentGeographySchema = z.object({
  country: z.string().min(2).default("Uganda"),
  region: z.string().min(2),
  subregion: z.string().min(2).optional(),
  county: z.string().min(2).optional(),
  district: z.string().min(2),
  administrativeUnit: z.string().trim().optional().default(""),
  subUnit: z.string().trim().optional().default(""),
  subcounty: z.string().trim().optional().default("")
}).superRefine((value, ctx) => {
  if (!value.subregion && !value.county) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Subregion or county is required",
      path: ["subregion"]
    });
  }
  if (!value.administrativeUnit && !value.county) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Administrative unit is required",
      path: ["administrativeUnit"]
    });
  }
  if (!value.subUnit && !value.subcounty) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Sub unit is required",
      path: ["subUnit"]
    });
  }
}).transform((value) => ({
  ...value,
  subregion: value.subregion || value.county,
  administrativeUnit: value.administrativeUnit || value.county || "",
  subUnit: value.subUnit || value.subcounty || "",
  county: value.county || value.subregion,
  subcounty: value.subUnit || value.subcounty
}));

const adminAgentCreateSchema = z.object({
  fullName: z.string().min(3),
  phoneNumber: z.string().min(7),
  nationalId: z.string().min(5),
  kycDetails: z.object({
    address: z.string().min(3).optional().default(""),
    notes: z.string().max(500).optional().default("")
  }).default({ address: "", notes: "" }),
  geography: agentGeographySchema
});

const agentApplicationDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNotes: z.string().max(500).optional(),
  geography: agentGeographySchema.optional()
}).superRefine((value, ctx) => {
  if (value.status === "APPROVED" && !value.geography) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Agent geography is required before approval",
      path: ["geography"]
    });
  }
});

const agentGeoFilterSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  subregion: z.string().optional(),
  district: z.string().optional(),
  administrativeUnit: z.string().optional(),
  subUnit: z.string().optional(),
  subcounty: z.string().optional(),
  agentId: z.string().uuid().optional()
});

const withdrawalSchema = z.object({
  amount: positiveNumberLikeSchema
});

const superAdminAgentReassignmentSchema = z.object({
  agentCode: z.string().trim().min(3).max(20),
  reason: z.string().trim().min(10).max(500)
});

const backofficeRoleSchema = z.enum(["RISK_ADMIN", "FINANCE_ADMIN"]);

const createBackofficeAccountSchema = z.object({
  fullName: z.string().min(3),
  loginId: z.string().trim().min(3).max(100),
  password: z.string().min(8),
  role: backofficeRoleSchema,
  email: z.string().email().optional().or(z.literal(""))
});

const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3)
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(20),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8)
}).superRefine((value, ctx) => {
  if (value.newPassword !== value.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match"
    });
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8)
}).superRefine((value, ctx) => {
  if (value.newPassword !== value.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match"
    });
  }
});

const manualPasswordResetSchema = z.object({
  accountType: z.enum(["USER", "BACKOFFICE", "AGENT", "INVESTOR"]),
  accountId: z.string().uuid(),
  newTemporaryPassword: z.string().min(8),
  reason: z.string().trim().min(5).max(500)
});

module.exports = {
  registerSchema,
  loginSchema,
  applicationSchema,
  adminApplicationQuerySchema,
  adminDecisionSchema,
  adminStatusUpdateSchema,
  applicantRegisterSchema,
  verificationSchema,
  loanCreateSchema,
  paymentSchema,
  loanRequestCreateSchema,
  loanPricingQuerySchema,
  loanRequestStatusUpdateSchema,
  agentApplicationSchema,
  adminAgentCreateSchema,
  agentGeoFilterSchema,
  agentApplicationDecisionSchema,
  withdrawalSchema,
  superAdminAgentReassignmentSchema,
  createBackofficeAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  manualPasswordResetSchema,
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingVerificationDecisionSchema
};
