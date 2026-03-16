import bcrypt from "bcryptjs";
import {
  AccountingClass,
  CriticalityClass,
  InventoryClass,
  ItemStatus,
  PrismaClient,
  RiskClass,
  UserRole,
  ValuationMethod
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  const centralStore = await prisma.location.upsert({
    where: { code: "DGC-CENTRAL-STORE" },
    update: {},
    create: {
      code: "DGC-CENTRAL-STORE",
      site: "DGC HQ",
      building: "Main Building",
      floor: "Ground",
      room: "Stores A",
      bin: "A-01",
      securityLevel: "HIGH",
      tempRequirement: "Ambient",
      humidityReq: "Standard",
      capacity: 2000,
      isActive: true
    }
  });

  const roles = [
    { employeeId: "EMP-0001", name: "System Admin", role: UserRole.SYSTEM_ADMIN, email: "admin@dgc.gov.jm" },
    { employeeId: "EMP-0002", name: "Storekeeper", role: UserRole.STOREKEEPER, email: "storekeeper@dgc.gov.jm" },
    { employeeId: "EMP-0003", name: "Approver", role: UserRole.APPROVING_OFFICER, email: "approver@dgc.gov.jm" },
    { employeeId: "EMP-0004", name: "Finance", role: UserRole.FINANCE_OFFICER, email: "finance@dgc.gov.jm" }
  ];

  for (const user of roles) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
        passwordHash,
        department: "Department of Government Chemist",
        approvalLevel: user.role === UserRole.APPROVING_OFFICER ? 3 : 2,
        mfaEnabled: true,
        activeFrom: new Date(),
        locationId: centralStore.id
      }
    });
  }

  const item = await prisma.inventoryItem.upsert({
    where: { itemCode: "ITM-SEED-0001" },
    update: {},
    create: {
      itemCode: "ITM-SEED-0001",
      standardName: "Nitrile Gloves",
      description: "Disposable nitrile gloves for laboratory and inspection usage",
      category: InventoryClass.PPE_SAFETY,
      subcategory: "Laboratory PPE",
      unitOfMeasure: "BOX",
      packSize: "100",
      serialNumberFlag: false,
      batchNumberFlag: true,
      expiryDateFlag: true,
      hazardClassFlag: false,
      reorderLevel: 20,
      reorderQuantity: 30,
      minLevel: 20,
      maxLevel: 200,
      safetyStock: 25,
      leadTimeDays: 14,
      standardCost: 2500,
      averageCost: 2500,
      valuationMethod: ValuationMethod.WEIGHTED_AVERAGE,
      status: ItemStatus.ACTIVE,
      issuePolicy: "CONTROLLED_ISSUE",
      inspectionRequired: true,
      receivingTolerancePercent: 5,
      assetInventoryBoundaryFlag: false,
      criticalityClass: CriticalityClass.ESSENTIAL,
      riskClass: RiskClass.EXPIRY_SENSITIVE,
      accountingClass: AccountingClass.EXCHANGE_PURCHASED
    }
  });

  await prisma.stockBalance.upsert({
    where: {
      itemId_locationId: {
        itemId: item.id,
        locationId: centralStore.id
      }
    },
    update: {},
    create: {
      itemId: item.id,
      locationId: centralStore.id,
      quantityOnHand: 120,
      quantityReserved: 0,
      quantityQuarantine: 0
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
