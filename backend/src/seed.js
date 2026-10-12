const bcrypt = require("bcryptjs");
const prisma = require("./prisma");
const { calculateAlesunRiskScore } = require("./services/riskScoring");
const { getFraudFlags, getScreeningIssues } = require("./services/applicationAnalysis");
const { generateRepaymentSchedule } = require("./services/loanService");
const { calculateTransparentLoanPricing } = require("./services/loanPricing.service");
const { createAuditLog } = require("./services/auditService");
const { flattenGeoSeedRows, UGANDA_COUNTRY_NAME } = require("./services/geography.service");

const userSeeds = [
  { fullName: "Amina Nansubuga", email: "admin@alesunfund.local", loginId: "admin", password: "Password123!", role: "ADMIN" },
  { fullName: "Samuel Kato", email: "credit@alesunfund.local", loginId: "credit", password: "Password123!", role: "CREDIT_OFFICER" },
  { fullName: "Grace Akello", email: "field@alesunfund.local", loginId: "field", password: "Password123!", role: "FIELD_OFFICER" }
];

const businessSeeds = [
  {
    businessName: "Kampala Agro Supplies",
    industry: "Agribusiness",
    location: "Kampala",
    yearsInOperation: 6,
    monthlyRevenue: [12000000, 11800000, 12500000, 12300000, 12100000, 12600000],
    expenses: 7200000,
    loanRequestAmount: 18000000,
    loanPurpose: "Expand wholesale stock and add cold chain storage for produce logistics.",
    ownerName: "Moses Mugisha",
    ownerPhone: "+256700111111",
    idNumber: "CM91001",
    ownerReliabilityScore: 88
  },
  {
    businessName: "Jinja Retail Mart",
    industry: "Retail",
    location: "Jinja",
    yearsInOperation: 3,
    monthlyRevenue: [7500000, 6900000, 7200000, 7600000, 7100000, 7050000],
    expenses: 5200000,
    loanRequestAmount: 9000000,
    loanPurpose: "Increase inventory depth and refurbish the trading floor before peak season.",
    ownerName: "Sarah Namubiru",
    ownerPhone: "+256700222222",
    idNumber: "CF82002",
    ownerReliabilityScore: 76
  },
  {
    businessName: "Gulu Motor Works",
    industry: "Automotive",
    location: "Gulu",
    yearsInOperation: 8,
    monthlyRevenue: [15800000, 14900000, 16200000, 16500000, 15900000, 16000000],
    expenses: 9800000,
    loanRequestAmount: 22000000,
    loanPurpose: "Purchase diagnostic equipment and scale spare parts inventory for fleet clients.",
    ownerName: "Peter Odoch",
    ownerPhone: "+256700333333",
    idNumber: "CM84003",
    ownerReliabilityScore: 91
  },
  {
    businessName: "Mbarara Fresh Dairy Hub",
    industry: "Food Processing",
    location: "Mbarara",
    yearsInOperation: 2,
    monthlyRevenue: [5400000, 6200000, 5900000, 5800000, 6100000, 6300000],
    expenses: 5000000,
    loanRequestAmount: 11000000,
    loanPurpose: "Acquire packaging materials and fund distributor outreach in western Uganda.",
    ownerName: "Judith Turyasingura",
    ownerPhone: "+256700444444",
    idNumber: "CF85004",
    ownerReliabilityScore: 71
  },
  {
    businessName: "Arua Build Centre",
    industry: "Construction Materials",
    location: "Arua",
    yearsInOperation: 1,
    monthlyRevenue: [4200000, 3800000, 3900000, 4100000, 3700000, 3950000],
    expenses: 3600000,
    loanRequestAmount: 9500000,
    loanPurpose: "Stock more cement and roofing supplies for newly awarded local contracts.",
    ownerName: "Francis Dralu",
    ownerPhone: "+256700555555",
    idNumber: "CM90005",
    ownerReliabilityScore: 64
  }
];

async function main() {
  const country = await prisma.country.upsert({
    where: { name: UGANDA_COUNTRY_NAME },
    update: {},
    create: { name: UGANDA_COUNTRY_NAME }
  });

  for (const row of flattenGeoSeedRows()) {
    const region = await prisma.region.upsert({
      where: {
        countryId_name: {
          countryId: country.id,
          name: row.region
        }
      },
      update: {},
      create: {
        countryId: country.id,
        name: row.region
      }
    });

    const subregion = await prisma.subregion.upsert({
      where: {
        regionId_name: {
          regionId: region.id,
          name: row.subregion
        }
      },
      update: {},
      create: {
        regionId: region.id,
        name: row.subregion
      }
    });

    const district = await prisma.district.upsert({
      where: {
        subregionId_name: {
          subregionId: subregion.id,
          name: row.district
        }
      },
      update: {
        type: row.districtType
      },
      create: {
        subregionId: subregion.id,
        name: row.district,
        type: row.districtType
      }
    });

    for (const administrativeUnitRow of row.administrativeUnits || []) {
      const administrativeUnit = await prisma.administrativeUnit.upsert({
        where: {
          districtId_name: {
            districtId: district.id,
            name: administrativeUnitRow.name
          }
        },
        update: {
          type: administrativeUnitRow.type
        },
        create: {
          districtId: district.id,
          name: administrativeUnitRow.name,
          type: administrativeUnitRow.type
        }
      });

      for (const subUnitRow of administrativeUnitRow.subUnits || []) {
        await prisma.subUnit.upsert({
          where: {
            administrativeUnitId_name: {
              administrativeUnitId: administrativeUnit.id,
              name: subUnitRow.name
            }
          },
          update: {
            type: subUnitRow.type
          },
          create: {
            administrativeUnitId: administrativeUnit.id,
            name: subUnitRow.name,
            type: subUnitRow.type
          }
        });
      }
    }
  }

  const seededRegions = ["Central", "Northern", "Eastern", "Western"];
  for (const regionName of seededRegions) {
    await createAuditLog(prisma, {
      action: `${regionName.toUpperCase()}_REGION_GEO_DATA_SEEDED`,
      entityType: "Geography",
      entityId: `${regionName.toLowerCase()}-region-seed`,
      metadata: {
        region: regionName,
        seededRows: flattenGeoSeedRows().filter((row) => row.region === regionName).length
      }
    });
  }

  const passwordHashes = await Promise.all(userSeeds.map((user) => bcrypt.hash(user.password, 10)));
  const createdUsers = [];

  for (let index = 0; index < userSeeds.length; index += 1) {
    const user = userSeeds[index];
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        loginId: user.loginId,
        status: "ACTIVE",
        isActive: true,
        passwordHash: passwordHashes[index]
      },
      create: {
        fullName: user.fullName,
        email: user.email,
        loginId: user.loginId,
        role: user.role,
        status: "ACTIVE",
        isActive: true,
        passwordHash: passwordHashes[index]
      }
    });
    createdUsers.push(created);
  }

  const creditOfficer = createdUsers.find((user) => user.role === "CREDIT_OFFICER");
  const fieldOfficer = createdUsers.find((user) => user.role === "FIELD_OFFICER");

  for (let index = 0; index < businessSeeds.length; index += 1) {
    const seed = businessSeeds[index];
    const risk = calculateAlesunRiskScore(seed);
    const documents = {
      businessPhotos: [],
      idDocument: [],
      financialRecords: [],
      supportingDocuments: []
    };
    const screeningIssues = getScreeningIssues({
      ...seed,
      monthlyExpenses: Array.from({ length: 6 }, () => seed.expenses),
      financialInfo: { cashAtBank: 1800000 + index * 100000, outstandingDebt: 250000 * index },
      documents
    });
    const fraudFlags = getFraudFlags({
      ...seed,
      monthlyExpenses: Array.from({ length: 6 }, () => seed.expenses),
      financialInfo: { cashAtBank: 1800000 + index * 100000, outstandingDebt: 250000 * index },
      documents
    });

    const business = await prisma.business.create({
      data: {
        name: seed.businessName,
        industry: seed.industry,
        location: seed.location,
        yearsInOperation: seed.yearsInOperation,
        ownerName: seed.ownerName,
        ownerPhone: seed.ownerPhone,
        idNumber: seed.idNumber,
        ownerReliabilityScore: seed.ownerReliabilityScore,
        averageMonthlyRevenue:
          seed.monthlyRevenue.reduce((sum, value) => sum + value, 0) / seed.monthlyRevenue.length
      }
    });

    const application = await prisma.loanApplication.create({
      data: {
        businessId: business.id,
        submittedById: creditOfficer.id,
        fieldOfficerId: fieldOfficer.id,
        source: index < 2 ? "PUBLIC" : "INTERNAL",
        status: index < 2 ? "NEW" : risk.status,
        monthlyRevenue: seed.monthlyRevenue,
        monthlyExpenses: Array.from({ length: 6 }, () => seed.expenses),
        expenses: seed.expenses,
        financialInfo: { cashAtBank: 1800000 + index * 100000, outstandingDebt: 250000 * index },
        documentPaths: documents,
        loanRequestAmount: seed.loanRequestAmount,
        loanPurpose: seed.loanPurpose,
        screeningIssues,
        fraudFlags
      }
    });

    await prisma.riskScore.create({
      data: {
        applicationId: application.id,
        score: risk.score,
        label: risk.label,
        recommendation: risk.recommendation,
        breakdown: risk.breakdown
      }
    });

    if (index < 3) {
      const pricing = calculateTransparentLoanPricing(seed.loanRequestAmount);
      const loan = await prisma.loan.create({
        data: {
          applicationId: application.id,
          userId: application.submittedById || null,
          principal: pricing.principalAmount,
          principalAmount: pricing.principalAmount,
          processingFee: pricing.processingFee,
          disbursedAmount: pricing.disbursedAmount,
          interestAmount: pricing.interestAmount,
          totalRepayableAmount: pricing.totalRepayableAmount,
          loanTerm: pricing.loanTerm,
          remainingBalance: 0,
          annualInterestRate: pricing.annualInterestRate,
          termMonths: pricing.termDays,
          status: "ACTIVE",
          disbursedAt: new Date(),
          startDate: new Date()
        }
      });

      const schedule = generateRepaymentSchedule({
        totalRepayableAmount: pricing.totalRepayableAmount,
        termDays: pricing.termDays,
        disbursedAt: loan.disbursedAt
      });

      const totalRepayable = schedule.reduce(
        (sum, scheduleItem) => sum + Number(scheduleItem.expectedAmount || 0),
        0
      );

      for (let paymentIndex = 0; paymentIndex < schedule.length; paymentIndex += 1) {
        const scheduleItem = schedule[paymentIndex];
        const wasPaid = paymentIndex < 2;
        await prisma.repaymentSchedule.create({
          data: {
            loanId: loan.id,
            dueDate: scheduleItem.dueDate,
            expectedAmount: scheduleItem.expectedAmount,
            paidAmount: wasPaid ? scheduleItem.expectedAmount : 0,
            status: wasPaid ? "PAID" : "PENDING"
          }
        });
      }

      await prisma.loan.update({
        where: { id: loan.id },
        data: {
          remainingBalance: Math.max(0, totalRepayable - (Number(schedule[0]?.expectedAmount || 0) * 2)),
          dueDate: schedule[schedule.length - 1]?.dueDate || null,
          fullyPaid: false,
          daysLate: 0
        }
      });
    }

    await createAuditLog(prisma, {
      userId: creditOfficer.id,
      action: "SEED_APPLICATION_CREATED",
      entityType: "LoanApplication",
      entityId: application.id,
      metadata: { seeded: true, source: index < 2 ? "PUBLIC" : "INTERNAL" }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
