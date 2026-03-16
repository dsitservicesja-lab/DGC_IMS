import { PrismaClient, ApprovalStatus, TransactionType, ApprovalLevel, InventoryClass } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export type ApprovalRequirement = {
  isRequired: boolean;
  level: ApprovalLevel;
  reason: string;
  rolesToApprove: string[];
  valueThreshold?: number;
  inventoryClass?: string;
  emergency?: boolean;
};

export class ApprovalMatrixService {
  /**
   * Evaluate approval requirements for a transaction based on value, class, department, and emergency
   */
  async evaluateApprovalRequirements(
    transactionType: TransactionType,
    itemId: string,
    quantity: number,
    value: Decimal | number,
    userId: string,
    inventoryClassCode?: string,
    isEmergency?: boolean
  ): Promise<ApprovalRequirement> {
    const valueNum = typeof value === "number" ? value : value.toNumber();

    // Fetch item to get inventory class and criticality
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      select: {
        standardName: true,
        category: true,
        criticalityClass: true,
        standardCost: true
      }
    });

    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    // Get approval matrix rules
    const rules = await prisma.approvalMatrixRule.findMany({
      where: { active: true }
    });

    // Evaluate value-based approval
    const valueRequirement = this.evaluateValueApproval(valueNum, rules);

    // Evaluate class-based approval (critical items require faster approval)
    const classRequirement = this.evaluateClassApproval(
      item.category as string,
      item.criticalityClass,
      rules as any
    );

    // Evaluate emergency flag
    const emergencyRequirement = isEmergency
      ? this.evaluateEmergencyApproval(
          transactionType,
          item.criticalityClass,
          rules
        )
      : null;

    // Evaluate transaction type specific rules
    const transactionRequirement = this.evaluateTransactionApproval(
      transactionType,
      item.category as string,
      rules
    );

    // Determine final approval level: highest of all applicable rules
    const applicableRequirements = [
      valueRequirement,
      classRequirement,
      emergencyRequirement,
      transactionRequirement
    ].filter((r): r is ApprovalRequirement => r !== null);

    if (applicableRequirements.length === 0) {
      return {
        isRequired: false,
        level: "NONE",
        reason: "No approval required",
        rolesToApprove: []
      };
    }

    // Get highest approval level
    const levelHierarchy: Record<ApprovalLevel, number> = {
      NONE: 0,
      DUTY_OFFICER: 1,
      SENIOR_OFFICER: 2,
      DIRECTOR: 3,
      FINANCIAL_SECRETARY: 4
    };

    const finalRequirement = applicableRequirements.reduce((highest, current) => {
      const currentLevel = levelHierarchy[current.level] || 0;
      const highestLevel = levelHierarchy[highest.level] || 0;

      return currentLevel > highestLevel ? current : highest;
    });

    return finalRequirement;
  }

  private evaluateValueApproval(
    value: number,
    rules: {
      id: string;
      valueThreshold: Decimal | null;
      approvalLevel: ApprovalLevel;
      approverRoles: string[];
    }[]
  ): ApprovalRequirement | null {
    const valueRules = rules.filter((r) => r.valueThreshold !== null);

    if (valueRules.length === 0) return null;

    // Find applicable rule (highest threshold that doesn't exceed value)
    const applicableRule = valueRules
      .filter((r) => (r.valueThreshold?.toNumber() || 0) <= value)
      .sort((a, b) => (b.valueThreshold?.toNumber() || 0) - (a.valueThreshold?.toNumber() || 0))
      .at(0);

    if (!applicableRule) return null;

    return {
      isRequired: true,
      level: applicableRule.approvalLevel,
      reason: `Value of ${value} exceeds threshold of ${applicableRule.valueThreshold}`,
      rolesToApprove: applicableRule.approverRoles
    };
  }

  private evaluateClassApproval(
    inventoryClass: string | null,
    criticalityClass: string | null,
    rules: {
      id: string;
      inventoryClass: string | null;
      approvalLevel: ApprovalLevel;
      approverRoles: string[];
    }[]
  ): ApprovalRequirement | null {
    const classRules = rules.filter(
      (r) =>
        (r.inventoryClass && inventoryClass && r.inventoryClass === inventoryClass) ||
        (r.inventoryClass && r.inventoryClass === criticalityClass)
    );

    if (classRules.length === 0) return null;

    const applicableRule = classRules.at(0);
    if (!applicableRule) return null;

    return {
      isRequired: true,
      level: applicableRule.approvalLevel,
      reason: `Item classification ${inventoryClass || criticalityClass} requires approval`,
      rolesToApprove: applicableRule.approverRoles
    };
  }

  private evaluateEmergencyApproval(
    transactionType: TransactionType,
    criticalityClass: string | null,
    rules: {
      id: string;
      transactionType: TransactionType | null;
      approvalLevel: ApprovalLevel;
      approverRoles: string[];
    }[]
  ): ApprovalRequirement | null {
    const emergencyRules = rules.filter(
      (r) =>
        r.transactionType === transactionType ||
        (criticalityClass === "CRITICAL")
    );

    if (emergencyRules.length === 0) return null;

    const applicableRule = emergencyRules.at(0);
    if (!applicableRule) return null;

    return {
      isRequired: true,
      level: applicableRule.approvalLevel,
      reason: "Emergency requisition requires priority approval",
      rolesToApprove: applicableRule.approverRoles,
      emergency: true
    };
  }

  private evaluateTransactionApproval(
    transactionType: TransactionType,
    inventoryClass: string | null,
    rules: {
      id: string;
      transactionType: TransactionType | null;
      inventoryClass: string | null;
      approvalLevel: ApprovalLevel;
      approverRoles: string[];
    }[]
  ): ApprovalRequirement | null {
    const transactionRules = rules.filter((r) => r.transactionType === transactionType);

    if (transactionRules.length === 0) return null;

    const applicableRule = transactionRules
      .filter((r) => !r.inventoryClass || r.inventoryClass === inventoryClass)
      .at(0);

    if (!applicableRule) return null;

    return {
      isRequired: true,
      level: applicableRule.approvalLevel,
      reason: `Transaction type ${transactionType} requires approval`,
      rolesToApprove: applicableRule.approverRoles
    };
  }

  /**
   * Verify if a user has permission to approve based on their role and approval level
   */
  async canApprove(
    userId: string,
    requirement: ApprovalRequirement,
    userRole?: string
  ): Promise<boolean> {
    if (!requirement.isRequired) {
      return true;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return false;
    }

    const roleToCheck = userRole || user.role;
    return requirement.rolesToApprove.includes(roleToCheck);
  }

  /**
   * Create default approval matrix rules for Jamaica GoJ compliance
   */
  async initializeDefaultRules(): Promise<void> {
    const existingRules = await prisma.approvalMatrixRule.count();
    if (existingRules > 0) return;

    const defaultRules = [
      // Value-based thresholds
      {
        name: "Value Threshold - Below 5000",
        valueThreshold: new Decimal("5000"),
        approvalLevel: "SENIOR_OFFICER" as ApprovalLevel,
        approverRoles: ["STORE_MANAGER", "SENIOR_OFFICER"],
        transactionType: null,
        inventoryClass: null,
        active: true
      },
      {
        name: "Value Threshold - 5000 to 50000",
        valueThreshold: new Decimal("50000"),
        approvalLevel: "DIRECTOR" as ApprovalLevel,
        approverRoles: ["DIRECTOR", "ACTING_DIRECTOR"],
        transactionType: null,
        inventoryClass: null,
        active: true
      },
      {
        name: "Value Threshold - Over 50000",
        valueThreshold: new Decimal("999999"),
        approvalLevel: "FINANCIAL_SECRETARY" as ApprovalLevel,
        approverRoles: ["FINANCIAL_SECRETARY", "CHIEF_ACCOUNTANT"],
        transactionType: null,
        inventoryClass: null,
        active: true
      },
      // Class-based rules
      {
        name: "Critical Items Approval",
        valueThreshold: null,
        approvalLevel: "SENIOR_OFFICER" as ApprovalLevel,
        approverRoles: ["SENIOR_OFFICER", "COMPLIANCE_OFFICER"],
        transactionType: null,
        inventoryClass: "CRITICAL",
        active: true
      },
      {
        name: "Hazardous Items Approval",
        valueThreshold: null,
        approvalLevel: "DIRECTOR" as ApprovalLevel,
        approverRoles: ["SAFETY_OFFICER", "DIRECTOR"],
        transactionType: null,
        inventoryClass: "HAZARDOUS",
        active: true
      },
      // Emergency approval
      {
        name: "Emergency Requisition Routing",
        valueThreshold: null,
        approvalLevel: "DUTY_OFFICER" as ApprovalLevel,
        approverRoles: ["DUTY_OFFICER", "DIRECTOR"],
        transactionType: "REQUISITION" as TransactionType,
        inventoryClass: null,
        active: true
      },
      // Transaction-specific
      {
        name: "Inter-MDA Transfer Approval",
        valueThreshold: null,
        approvalLevel: "DIRECTOR" as ApprovalLevel,
        approverRoles: ["FINANCIAL_SECRETARY", "DIRECTOR"],
        transactionType: "TRANSFER_OUT" as TransactionType,
        inventoryClass: null,
        active: true
      },
      {
        name: "Disposal Authority Approval",
        valueThreshold: null,
        approvalLevel: "DIRECTOR" as ApprovalLevel,
        approverRoles: ["DISPOSAL_AUTHORITY", "DIRECTOR"],
        transactionType: null,
        inventoryClass: null,
        active: true
      }
    ];

    for (const rule of defaultRules) {
      await prisma.approvalMatrixRule.create({ data: rule });
    }

    console.log(`Initialized ${defaultRules.length} default approval matrix rules`);
  }
}

export const approvalMatrixService = new ApprovalMatrixService();
