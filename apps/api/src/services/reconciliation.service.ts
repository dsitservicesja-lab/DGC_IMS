/**
 * Reconciliation Jobs - Scheduled tasks for syncing external systems
 * Uses node-cron for scheduling periodically
 */

import { PrismaClient, UserRole } from "@prisma/client";
import { createERPAdapter } from "../adapters/erp.adapter.js";
import { createProcurementAdapter } from "../adapters/procurement.adapter.js";
import { createHRAdapter } from "../adapters/hr.adapter.js";

const prisma = new PrismaClient();

export class ReconciliationJobService {
  private erpAdapter = createERPAdapter("MOCK");
  private procurementAdapter = createProcurementAdapter("MOCK");
  private hrAdapter = createHRAdapter("MOCK");

  /**
   * Sync purchase orders from ERP
   * Runs every 6 hours
   */
  async syncPurchaseOrders(): Promise<void> {
    try {
      console.log("[RECONCILIATION] Starting PO sync from ERP...");

      const purchaseOrders = await this.erpAdapter.getPurchaseOrders({
        status: "APPROVED"
      });

      let createdCount = 0;
      let updatedCount = 0;

      for (const po of purchaseOrders) {
        // Check if PO already exists
        const existing = await prisma.purchaseOrder.findUnique({
          where: { poNumber: po.poNumber }
        });

        if (existing) {
          // Update existing PO
          await prisma.purchaseOrder.update({
            where: { poNumber: po.poNumber },
            data: {
              supplierName: po.supplierName,
              procurementMethod: "SYNCED_FROM_ERP",
              status: po.status
            }
          });
          updatedCount++;
        } else {
          // Create new PO
          await prisma.purchaseOrder.create({
            data: {
              poNumber: po.poNumber,
              procurementMethod: "OPEN_COMPETITIVE_BIDDING",
              supplierName: po.supplierName,
              contractReference: `ERP-${po.poNumber}`,
              status: po.status,
              approvedBy: po.approvedBy,
              approvedAt: new Date(po.approvedDate),
              fsApprovalRequired: po.totalValue > 1000000
            }
          });
          createdCount++;
        }
      }

      console.log(
        `[RECONCILIATION] PO Sync Complete: Created ${createdCount}, Updated ${updatedCount}`
      );

      // Log reconciliation event
      await prisma.auditLog.create({
        data: {
          action: "PO_SYNC_COMPLETED",
          entityType: "PURCHASE_ORDER",
          entityId: "BATCH",
          reasonCode: `Synced ${createdCount} new, ${updatedCount} updated`,
          userId: "SYSTEM",
          role: "SYSTEM_ADMIN"
        }
      });
    } catch (error) {
      console.error("[RECONCILIATION] PO Sync Error:", error);

      // Log error
      await prisma.auditLog.create({
        data: {
          action: "PO_SYNC_FAILED",
          entityType: "PURCHASE_ORDER",
          entityId: "BATCH",
          reasonCode: error instanceof Error ? error.message : "Unknown error",
          userId: "SYSTEM",
          role: "SYSTEM_ADMIN"
        }
      });
    }
  }

  /**
   * Sync employee directory and cost centres from HR
   * Runs daily
   */
  async syncEmployeeDirectory(): Promise<void> {
    try {
      console.log("[RECONCILIATION] Starting employee directory sync from HR...");

      const departments = await this.hrAdapter.getAllDepartments();

      let syncedCount = 0;

      for (const dept of departments) {
        const employees = await this.hrAdapter.getEmployeesByDepartment(dept.departmentCode);

        for (const emp of employees) {
          // Check if user already exists
          const existing = await prisma.user.findUnique({
            where: { employeeId: emp.employeeId }
          });

          if (!existing && emp.isActive) {
          // Create new user with temporary password (must be changed on first login)
          const roleMap: Record<string, UserRole> = {
            "Store Manager": "STOREKEEPER" as UserRole,
            "Store Officer": "RECEIVING_OFFICER" as UserRole,
            "Finance Officer": "FINANCE_OFFICER" as UserRole,
            "Compliance Officer": "INTERNAL_AUDITOR" as UserRole,
            "Director": "SYSTEM_ADMIN" as UserRole
          };

          const role: UserRole = (roleMap[emp.position] as UserRole) || ("REQUISITIONING_OFFICER" as UserRole);

          await prisma.user.create({
            data: {
              employeeId: emp.employeeId,
              name: emp.name,
              email: emp.email,
              passwordHash: "TEMP_PASSWORD_CHANGE_REQUIRED",
              role: role,
              department: emp.department,
              loginMethod: "LDAP",
              activeFrom: new Date(),
              isActive: true
            }
          });

            syncedCount++;
          }
        }
      }

      console.log(`[RECONCILIATION] Employee Sync Complete: Synced ${syncedCount} new employees`);

      // Log reconciliation event
      await prisma.auditLog.create({
        data: {
          action: "EMPLOYEE_SYNC_COMPLETED",
          entityType: "USER",
          entityId: "BATCH",
          reasonCode: `Synced ${syncedCount} employees`,
          userId: "SYSTEM",
          role: "SYSTEM_ADMIN"
        }
      });
    } catch (error) {
      console.error("[RECONCILIATION] Employee Sync Error:", error);

      await prisma.auditLog.create({
        data: {
          action: "EMPLOYEE_SYNC_FAILED",
          entityType: "USER",
          entityId: "BATCH",
          reasonCode: error instanceof Error ? error.message : "Unknown error",
          userId: "SYSTEM",
          role: "SYSTEM_ADMIN"
        }
      });
    }
  }

  /**
   * Sync supplier compliance status
   * Runs weekly
   */
  async syncSupplierCompliance(): Promise<void> {
    try {
      console.log("[RECONCILIATION] Starting supplier compliance sync...");

      const purchaseOrders = await prisma.purchaseOrder.findMany({
        distinct: ["supplierName"]
      });

      let flaggedCount = 0;

      for (const po of purchaseOrders) {
        // This is a simplified example - in reality you'd fetch supplier ID
        try {
          const compliance = await this.procurementAdapter.getSupplierCompliance(
            po.supplierName
          );

          if (!compliance.taxCompliant || compliance.blacklisted) {
            console.log(
              `[RECONCILIATION] WARNING: Supplier ${po.supplierName} compliance issue detected`
            );

            // Create compliance alert
            await prisma.auditLog.create({
              data: {
                action: "SUPPLIER_COMPLIANCE_ALERT",
                entityType: "SUPPLIER",
                entityId: po.supplierName,
                reasonCode: `Tax Compliant: ${compliance.taxCompliant}, Blacklisted: ${compliance.blacklisted}`,
                userId: "SYSTEM",
                role: "SYSTEM_ADMIN"
              }
            });

            flaggedCount++;
          }
        } catch (error) {
          // Supplier not found in procurement system - log but continue
          console.warn(
            `[RECONCILIATION] Could not fetch compliance for supplier ${po.supplierName}`
          );
        }
      }

      console.log(
        `[RECONCILIATION] Supplier Compliance Sync Complete: Flagged ${flaggedCount} issues`
      );
    } catch (error) {
      console.error("[RECONCILIATION] Supplier Compliance Sync Error:", error);
    }
  }

  /**
   * Reconcile stock transactions with ERP
   * Runs every 4 hours
   */
  async reconcileStockTransactions(): Promise<void> {
    try {
      console.log("[RECONCILIATION] Starting stock transaction reconciliation...");

      // Fetch unreconciled transactions from database
      const unreconciledTxns = await prisma.stockTransaction.findMany({
        where: {
          linkedDocumentId: null
        },
        take: 100
      });

      let reconciledCount = 0;
      let discrepancyCount = 0;

      for (const txn of unreconciledTxns) {
        // Attempt to find matching ERP receipt
        const purchaseOrders = await this.erpAdapter.getPurchaseOrders();

        const matchingPO = purchaseOrders.find(
          (po) => po.itemCode === txn.itemId && po.status === "RECEIVED"
        );

        if (matchingPO) {
          // Link transaction to PO
          await prisma.stockTransaction.update({
            where: { id: txn.id },
            data: {
              linkedDocumentId: matchingPO.poNumber
            }
          });

          reconciledCount++;
        } else {
          // Potential discrepancy
          discrepancyCount++;

          console.log(
            `[RECONCILIATION] Discrepancy: Transaction ${txn.transactionNumber} unmatched in ERP`
          );
        }
      }

      console.log(
        `[RECONCILIATION] Stock Reconciliation Complete: Reconciled ${reconciledCount}, Discrepancies ${discrepancyCount}`
      );

      if (discrepancyCount > 0) {
        const txn = unreconciledTxns[0];
        if (txn) {
          await prisma.auditLog.create({
            data: {
              action: "STOCK_DISCREPANCY_DETECTED",
              entityType: "STOCK_TRANSACTION",
              entityId: "BATCH",
              reasonCode: `${discrepancyCount} unmatched transactions`,
              userId: "SYSTEM",
              role: "SYSTEM_ADMIN" as any
            }
          });
        }
      }
    } catch (error) {
      console.error("[RECONCILIATION] Stock Reconciliation Error:", error);
    }
  }

  /**
   * Check and update pricing from ERP
   * Runs daily
   */
  async syncItemPricing(): Promise<void> {
    try {
      console.log("[RECONCILIATION] Starting item pricing sync...");

      const items = await prisma.inventoryItem.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, itemCode: true }
      });

      let updatedCount = 0;

      for (const item of items) {
        try {
          const pricing = await this.erpAdapter.getPricingData(item.itemCode);

          const PRICE_CHANGE_THRESHOLD = 0.1; // 10% threshold
          const currentPrice = Number(
            (
              await prisma.inventoryItem.findUnique({
                where: { id: item.id },
                select: { averageCost: true }
              })
            )?.averageCost || 0
          );

          const priceDiff = Math.abs(currentPrice - pricing.unitPrice) / currentPrice;

          if (priceDiff > PRICE_CHANGE_THRESHOLD) {
            console.log(
              `[RECONCILIATION] Price update for ${item.itemCode}: ${currentPrice} -> ${pricing.unitPrice}`
            );

            await prisma.inventoryItem.update({
              where: { id: item.id },
              data: {
                lastCost: currentPrice,
                averageCost: pricing.unitPrice
              }
            });

            updatedCount++;

            // Log price change
            await prisma.auditLog.create({
              data: {
                action: "PRICE_UPDATE",
                entityType: "INVENTORY_ITEM",
                entityId: item.id,
                beforeValue: String(currentPrice),
                afterValue: String(pricing.unitPrice),
                reasonCode: "ERP_SYNC",
                userId: "SYSTEM",
                role: "SYSTEM_ADMIN"
              }
            });
          }
        } catch (error) {
          // Item pricing not found in ERP - skip
        }
      }

      console.log(`[RECONCILIATION] Pricing Sync Complete: Updated ${updatedCount} prices`);
    } catch (error) {
      console.error("[RECONCILIATION] Pricing Sync Error:", error);
    }
  }

  private mapPositionToRole(position: string): string {
    const roleMap: Record<string, string> = {
      "Store Manager": "STOREKEEPER",
      "Store Officer": "RECEIVING_OFFICER",
      "Finance Officer": "FINANCE_OFFICER",
      "Compliance Officer": "INTERNAL_AUDITOR",
      "Director": "SYSTEM_ADMIN"
    };

    return roleMap[position] || "REQUISITIONING_OFFICER";
  }
}

// Create and export singleton
export const reconciliationJobService = new ReconciliationJobService();
