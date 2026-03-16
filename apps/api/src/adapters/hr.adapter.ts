/**
 * HR Adapter - Integration with Human Resources System
 * Handles employee directory, department structure, and delegation synchronization
 */

export interface EmployeeData {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  position: string;
  manager: string;
  costCentre: string;
  isActive: boolean;
}

export interface DepartmentData {
  departmentCode: string;
  departmentName: string;
  manager: string;
  managerEmail: string;
  costCentres: string[];
}

export interface DelegationData {
  delegationId: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  startDate: string;
  endDate: string;
  scope: "APPROVALS" | "REQUISITIONS" | "DISPOSALS" | "ALL";
  reason: string;
}

abstract class HRAdapterBase {
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
      throw new Error(`HR API Error: ${response.statusText}`);
    }

    return response.json();
  }

  abstract getEmployee(employeeId: string): Promise<EmployeeData | null>;
  abstract getEmployeesByDepartment(departmentCode: string): Promise<EmployeeData[]>;
  abstract getDepartment(departmentCode: string): Promise<DepartmentData | null>;
  abstract getAllDepartments(): Promise<DepartmentData[]>;
  abstract getActiveDelegations(employeeId: string): Promise<DelegationData[]>;
}

export class PSIP_HRAdapter extends HRAdapterBase {
  async getEmployee(employeeId: string): Promise<EmployeeData | null> {
    try {
      const rawData = await this.makeRequest("GET", `/employees/${employeeId}`);
      const data = rawData as any;
      return {
        employeeId: data.personnelNumber,
        name: data.firstName + " " + data.lastName,
        email: data.email,
        department: data.departmentCode,
        position: data.jobTitle,
        manager: data.supervisorName,
        costCentre: data.costCentreCode,
        isActive: data.employmentStatus === "ACTIVE"
      };
    } catch {
      return null;
    }
  }

  async getEmployeesByDepartment(departmentCode: string): Promise<EmployeeData[]> {
    const rawData = await this.makeRequest("GET", `/departments/${departmentCode}/employees`);
    if (!Array.isArray(rawData)) return [];

    return (rawData as any[]).map((emp: any) => {
      const e = emp as any;
      return {
        employeeId: e.personnelNumber,
        name: e.firstName + " " + e.lastName,
        email: e.email,
        department: departmentCode,
        position: e.jobTitle,
        manager: e.supervisorName,
        costCentre: e.costCentreCode,
        isActive: e.employmentStatus === "ACTIVE"
      };
    });
  }

  async getDepartment(departmentCode: string): Promise<DepartmentData | null> {
    try {
      const rawData = await this.makeRequest("GET", `/departments/${departmentCode}`);
      const data = rawData as any;
      return {
        departmentCode,
        departmentName: data.departmentName,
        manager: data.managerName,
        managerEmail: data.managerEmail,
        costCentres: data.costCentres || []
      };
    } catch {
      return null;
    }
  }

  async getAllDepartments(): Promise<DepartmentData[]> {
    const rawData = await this.makeRequest("GET", "/departments");
    if (!Array.isArray(rawData)) return [];

    return (rawData as any[]).map((dept: any) => {
      const d = dept as any;
      return {
        departmentCode: d.departmentCode,
        departmentName: d.departmentName,
        manager: d.managerName,
        managerEmail: d.managerEmail,
        costCentres: d.costCentres || []
      };
    });
  }

  async getActiveDelegations(employeeId: string): Promise<DelegationData[]> {
    const rawData = await this.makeRequest("GET", `/employees/${employeeId}/delegations?active=true`);
    if (!Array.isArray(rawData)) return [];

    return (rawData as any[]).map((del: any) => {
      const d = del as any;
      return {
        delegationId: d.delegationId,
        fromEmployeeId: d.fromPersonnelNumber,
        toEmployeeId: d.toPersonnelNumber,
        startDate: d.startDate,
        endDate: d.endDate,
        scope: d.delegationScope || "ALL",
        reason: d.reason
      };
    });
  }
}

export class MockHRAdapter extends HRAdapterBase {
  async getEmployee(employeeId: string): Promise<EmployeeData | null> {
    return {
      employeeId,
      name: "Jane Smith",
      email: "jane@dgc.go.jm",
      department: "STORES",
      position: "Store Manager",
      manager: "Robert Johnson",
      costCentre: "CC-2100",
      isActive: true
    };
  }

  async getEmployeesByDepartment(departmentCode: string): Promise<EmployeeData[]> {
    return [
      {
        employeeId: "EMP-001",
        name: "Jane Smith",
        email: "jane@dgc.go.jm",
        department: departmentCode,
        position: "Store Manager",
        manager: "Robert Johnson",
        costCentre: "CC-2100",
        isActive: true
      },
      {
        employeeId: "EMP-002",
        name: "Michael Brown",
        email: "michael@dgc.go.jm",
        department: departmentCode,
        position: "Store Officer",
        manager: "Jane Smith",
        costCentre: "CC-2100",
        isActive: true
      }
    ];
  }

  async getDepartment(departmentCode: string): Promise<DepartmentData | null> {
    return {
      departmentCode,
      departmentName: "Stores Management Division",
      manager: "Robert Johnson",
      managerEmail: "robert@dgc.go.jm",
      costCentres: ["CC-2100", "CC-2101"]
    };
  }

  async getAllDepartments(): Promise<DepartmentData[]> {
    return [
      {
        departmentCode: "STORES",
        departmentName: "Stores Management Division",
        manager: "Robert Johnson",
        managerEmail: "robert@dgc.go.jm",
        costCentres: ["CC-2100", "CC-2101"]
      },
      {
        departmentCode: "FINANCE",
        departmentName: "Finance Division",
        manager: "Patricia Wong",
        managerEmail: "patricia@dgc.go.jm",
        costCentres: ["CC-3100"]
      }
    ];
  }

  async getActiveDelegations(employeeId: string): Promise<DelegationData[]> {
    return [
      {
        delegationId: "DEL-001",
        fromEmployeeId: employeeId,
        toEmployeeId: "EMP-002",
        startDate: "2026-03-16",
        endDate: "2026-03-30",
        scope: "APPROVALS",
        reason: "Annual leave"
      }
    ];
  }
}

export function createHRAdapter(
  type: "PSIP" | "MOCK",
  apiUrl?: string,
  apiKey?: string
): HRAdapterBase {
  const url = apiUrl || process.env.HR_API_URL || "http://localhost:8082";
  const key = apiKey || process.env.HR_API_KEY || "test-key";

  switch (type) {
    case "PSIP":
      return new PSIP_HRAdapter(url, key);
    case "MOCK":
    default:
      return new MockHRAdapter(url, key);
  }
}
