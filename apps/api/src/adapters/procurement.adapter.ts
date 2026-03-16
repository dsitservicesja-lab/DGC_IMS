/**
 * Procurement Adapter - Integration with Procurement System
 * Handles supplier management, compliance status, and contract terms retrieval
 */

export interface SupplierData {
  supplierCode: string;
  supplierName: string;
  contactPerson: string;
  email: string;
  phone: string;
  taxCompliant: boolean;
  taxCertificateExpiryDate: string;
  registeredAddress: string;
  bankAccount: string;
}

export interface SupplierComplianceStatus {
  supplierId: string;
  taxCompliant: boolean;
  audited: boolean;
  blacklisted: boolean;
  lastAuditDate: string;
  certifications: string[];
}

export interface ContractTerms {
  contractNumber: string;
  supplierId: string;
  itemCode: string;
  unitPrice: number;
  minQuantity: number;
  maxQuantity: number;
  paymentTerms: string;
  deliveryTerms: string;
  validFrom: string;
  validTo: string;
}

abstract class ProcurementAdapterBase {
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
        "X-API-Key": this.apiKey
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Procurement API Error: ${response.statusText}`);
    }

    return response.json();
  }

  abstract getSupplier(supplierCode: string): Promise<SupplierData>;
  abstract getSupplierCompliance(supplierId: string): Promise<SupplierComplianceStatus>;
  abstract getContractTerms(
    supplierId: string,
    itemCode: string
  ): Promise<ContractTerms | null>;
}

export class UNDB_ProcurementAdapter extends ProcurementAdapterBase {
  async getSupplier(supplierCode: string): Promise<SupplierData> {
    const rawData = await this.makeRequest("GET", `/suppliers/${supplierCode}`);
    const data = rawData as any;
    return {
      supplierCode: data.vendorCode,
      supplierName: data.vendorName,
      contactPerson: data.primaryContact,
      email: data.email,
      phone: data.phone,
      taxCompliant: data.taxCompliance?.status === "COMPLIANT",
      taxCertificateExpiryDate: data.taxCompliance?.expiryDate,
      registeredAddress: data.registeredAddress,
      bankAccount: data.bankDetails?.accountNumber
    };
  }

  async getSupplierCompliance(supplierId: string): Promise<SupplierComplianceStatus> {
    const rawData = await this.makeRequest("GET", `/suppliers/${supplierId}/compliance`);
    const data = rawData as any;
    return {
      supplierId,
      taxCompliant: data.taxStatus === "COMPLIANT",
      audited: data.lastAudit !== null,
      blacklisted: data.blacklistStatus === "ACTIVE",
      lastAuditDate: data.lastAudit,
      certifications: data.certifications || []
    };
  }

  async getContractTerms(
    supplierId: string,
    itemCode: string
  ): Promise<ContractTerms | null> {
    try {
      const rawData = await this.makeRequest(
        "GET",
        `/suppliers/${supplierId}/contracts?item=${itemCode}`
      );
      const data = rawData as any;

      if (!data || !data.contractNumber) return null;

      return {
        contractNumber: data.contractNumber,
        supplierId,
        itemCode,
        unitPrice: data.unitPrice,
        minQuantity: data.minimumQuantity,
        maxQuantity: data.maximumQuantity,
        paymentTerms: data.paymentTerms,
        deliveryTerms: data.deliveryTerms,
        validFrom: data.effectiveDate,
        validTo: data.expiryDate
      };
    } catch {
      return null;
    }
  }
}

export class MockProcurementAdapter extends ProcurementAdapterBase {
  async getSupplier(supplierCode: string): Promise<SupplierData> {
    return {
      supplierCode,
      supplierName: "ChemSupply Limited",
      contactPerson: "John Doe",
      email: "john@chemsupply.com",
      phone: "+1-876-555-0100",
      taxCompliant: true,
      taxCertificateExpiryDate: "2026-12-31",
      registeredAddress: "Kingston, Jamaica",
      bankAccount: "0012345678901"
    };
  }

  async getSupplierCompliance(supplierId: string): Promise<SupplierComplianceStatus> {
    return {
      supplierId,
      taxCompliant: true,
      audited: true,
      blacklisted: false,
      lastAuditDate: "2025-12-01",
      certifications: ["ISO 9001", "ISO 14001"]
    };
  }

  async getContractTerms(
    supplierId: string,
    itemCode: string
  ): Promise<ContractTerms | null> {
    return {
      contractNumber: "CONTRACT-2025-001",
      supplierId,
      itemCode,
      unitPrice: 250,
      minQuantity: 10,
      maxQuantity: 1000,
      paymentTerms: "Net 30 days",
      deliveryTerms: "FOB Kingston",
      validFrom: "2025-01-01",
      validTo: "2026-12-31"
    };
  }
}

export function createProcurementAdapter(
  type: "UNDB" | "MOCK",
  apiUrl?: string,
  apiKey?: string
): ProcurementAdapterBase {
  const url = apiUrl || process.env.PROCUREMENT_API_URL || "http://localhost:8081";
  const key = apiKey || process.env.PROCUREMENT_API_KEY || "test-key";

  switch (type) {
    case "UNDB":
      return new UNDB_ProcurementAdapter(url, key);
    case "MOCK":
    default:
      return new MockProcurementAdapter(url, key);
  }
}
