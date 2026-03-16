/**
 * ERP Adapter - Integration with Enterprise Resource Planning System
 * Handles procurement order retrieval, pricing sync, and receipt confirmations
 */

export interface PurchaseOrderData {
  poNumber: string;
  supplierName: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  deliveryDate: string;
  status: "DRAFT" | "APPROVED" | "SENT" | "RECEIVED" | "CANCELLED";
  approvedBy: string;
  approvedDate: string;
}

export interface GoodsReceiptConfirmation {
  poNumber: string;
  itemCode: string;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  inspectionDate: string;
  inspectedBy: string;
  remarks: string;
}

export interface PricingData {
  itemCode: string;
  unitPrice: number;
  effectiveDate: string;
  currency: string;
  source: "PURCHASE_ORDER" | "PRICE_CATALOG" | "CONTRACT";
}

abstract class ERPAdapterBase {
  protected apiUrl: string;
  protected apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  protected async makeRequest(
    method: "GET" | "POST" | "PUT",
    endpoint: string,
    body?: unknown
  ): Promise<unknown> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`ERP API Error: ${response.statusText}`);
    }

    return response.json();
  }

  abstract getPurchaseOrders(filters?: Record<string, unknown>): Promise<PurchaseOrderData[]>;
  abstract confirmGoodsReceipt(confirmation: GoodsReceiptConfirmation): Promise<void>;
  abstract getPricingData(itemCode: string): Promise<PricingData>;
}

export class SAP_ERPAdapter extends ERPAdapterBase {
  async getPurchaseOrders(filters?: Record<string, unknown>): Promise<PurchaseOrderData[]> {
    // SAP API endpoint for purchase orders
    const queryParams = new URLSearchParams();
    if (filters?.status) {
      queryParams.append("status", String(filters.status));
    }
    if (filters?.supplierName) {
      queryParams.append("supplierName", String(filters.supplierName));
    }

    const data = await this.makeRequest("GET", `/api/purchaseOrders?${queryParams}`);
    return this.transformSAPPOs(data);
  }

  async confirmGoodsReceipt(confirmation: GoodsReceiptConfirmation): Promise<void> {
    await this.makeRequest("POST", "/api/goodsReceipts", {
      purchaseOrderNumber: confirmation.poNumber,
      materialCode: confirmation.itemCode,
      receivedQuantity: confirmation.quantityReceived,
      acceptedQuantity: confirmation.quantityAccepted,
      rejectedQuantity: confirmation.quantityRejected,
      inspectionDate: confirmation.inspectionDate,
      remarks: confirmation.remarks
    });
  }

  async getPricingData(itemCode: string): Promise<PricingData> {
    const rawData = await this.makeRequest("GET", `/api/materials/${itemCode}/pricing`);
    const data = rawData as any;
    return {
      itemCode,
      unitPrice: data.standardPrice,
      effectiveDate: data.validFrom,
      currency: data.currency || "JMD",
      source: "PURCHASE_ORDER"
    };
  }

  private transformSAPPOs(rawData: unknown): PurchaseOrderData[] {
    // Transform SAP API response to standard format
    if (!Array.isArray(rawData)) return [];

    return (rawData as any[]).map((po: any) => {
      const data = po as any;
      return {
        poNumber: data.purchaseOrderNumber,
        supplierName: data.vendorName,
        itemCode: data.materialNumber,
        quantity: data.quantity,
        unitPrice: data.netPrice,
        totalValue: data.netAmount,
        deliveryDate: data.deliveryDate,
        status: data.status?.toUpperCase?.() || "DRAFT",
        approvedBy: data.approverName,
        approvedDate: data.approvalDate
      };
    });
  }
}

export class Oracle_ERPAdapter extends ERPAdapterBase {
  async getPurchaseOrders(filters?: Record<string, unknown>): Promise<PurchaseOrderData[]> {
    const data = await this.makeRequest("GET", "/api/po/recent", filters);
    return this.transformOraclePOs(data);
  }

  async confirmGoodsReceipt(confirmation: GoodsReceiptConfirmation): Promise<void> {
    await this.makeRequest("POST", "/api/grn/create", {
      poHeaderId: confirmation.poNumber,
      itemId: confirmation.itemCode,
      receivedQty: confirmation.quantityReceived,
      acceptedQty: confirmation.quantityAccepted,
      rejectedQty: confirmation.quantityRejected,
      inspectionDate: confirmation.inspectionDate,
      comments: confirmation.remarks
    });
  }

  async getPricingData(itemCode: string): Promise<PricingData> {
    const rawData = await this.makeRequest("GET", `/api/items/${itemCode}/pricing`);
    const data = rawData as any;
    return {
      itemCode,
      unitPrice: data.unitPrice,
      effectiveDate: data.effectiveDate,
      currency: data.currency || "JMD",
      source: "PURCHASE_ORDER"
    };
  }

  private transformOraclePOs(rawData: unknown): PurchaseOrderData[] {
    if (!Array.isArray(rawData)) return [];

    return (rawData as any[]).map((po: any) => {
      const data = po as any;
      return {
        poNumber: data.poNumber,
        supplierName: data.supplierName,
        itemCode: data.itemNumber,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalValue: data.lineAmount,
        deliveryDate: data.promisedDate,
        status: data.orderStatus?.toUpperCase?.() || "DRAFT",
        approvedBy: data.approvedBy,
        approvedDate: data.approvalDate
      };
    });
  }
}

export class MockERPAdapter extends ERPAdapterBase {
  async getPurchaseOrders(filters?: Record<string, unknown>): Promise<PurchaseOrderData[]> {
    // Return mock data for testing
    return [
      {
        poNumber: "PO-2026-001",
        supplierName: "ChemSupply Limited",
        itemCode: "ITEM-001",
        quantity: 100,
        unitPrice: 250,
        totalValue: 25000,
        deliveryDate: "2026-04-01",
        status: "APPROVED",
        approvedBy: "Finance Officer",
        approvedDate: "2026-03-16"
      }
    ];
  }

  async confirmGoodsReceipt(confirmation: GoodsReceiptConfirmation): Promise<void> {
    console.log("Mock GRN Confirmation:", confirmation);
  }

  async getPricingData(itemCode: string): Promise<PricingData> {
    return {
      itemCode,
      unitPrice: 250,
      effectiveDate: "2026-01-01",
      currency: "JMD",
      source: "PURCHASE_ORDER"
    };
  }
}

export function createERPAdapter(
  type: "SAP" | "ORACLE" | "MOCK",
  apiUrl?: string,
  apiKey?: string
): ERPAdapterBase {
  const url = apiUrl || process.env.ERP_API_URL || "http://localhost:8080";
  const key = apiKey || process.env.ERP_API_KEY || "test-key";

  switch (type) {
    case "SAP":
      return new SAP_ERPAdapter(url, key);
    case "ORACLE":
      return new Oracle_ERPAdapter(url, key);
    case "MOCK":
      return new MockERPAdapter(url, key);
    default:
      return new MockERPAdapter(url, key);
  }
}
