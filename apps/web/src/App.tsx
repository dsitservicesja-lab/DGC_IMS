import { useMemo, useState } from "react";
import { KpiCard } from "./components/KpiCard";
import { DataTable } from "./components/DataTable";
import { QuickActions } from "./components/QuickActions";
import { RequisitionForm } from "./components/RequisitionForm";
import { ReceivingForm } from "./components/ReceivingForm";
import { IssueForm } from "./components/IssueForm";
import { TransferForm } from "./components/TransferForm";
import { AdjustmentForm } from "./components/AdjustmentForm";
import { DisposalForm } from "./components/DisposalForm";
import { TransactionList } from "./components/TransactionList";
import { ToastProvider, useToast } from "./components/Toast";

type Kpis = {
  stockAccuracyPercent: number;
  orderFillRate: number;
  stockOutItems: number;
  requisitionsSubmitted: number;
  requisitionsApproved: number;
  shrinkageQuantity30Days: number;
};

const sampleKpis: Kpis = {
  stockAccuracyPercent: 98.42,
  orderFillRate: 92.8,
  stockOutItems: 7,
  requisitionsSubmitted: 14,
  requisitionsApproved: 56,
  shrinkageQuantity30Days: 3
};

const sampleLedger = [
  { transactionNumber: "TX-2026-9DG4J2KQ", type: "RECEIPT", item: "Nitrile Gloves", quantity: 120, location: "DGC-CENTRAL-STORE", date: "2026-03-16" },
  { transactionNumber: "TX-2026-3HR8L2MA", type: "ISSUE", item: "Nitrile Gloves", quantity: 25, location: "Lab-2", date: "2026-03-16" },
  { transactionNumber: "TX-2026-4KN7V5BY", type: "TRANSFER_OUT", item: "Face Masks", quantity: 10, location: "Branch-Montego", date: "2026-03-15" }
];

const sampleAlerts = [
  { alert: "Near expiry", item: "Hydrogen Peroxide", severity: "High", due: "2026-04-01" },
  { alert: "Below minimum", item: "Safety Boots", severity: "Medium", due: "Immediate" },
  { alert: "Audit exception", item: "Controlled Stationery", severity: "High", due: "Review open" }
];

type ActiveForm = "requisition" | "receiving" | "issue" | "transfer" | "adjustment" | "disposal" | null;

function AppContent() {
  const [kpis, setKpis] = useState<Kpis>(sampleKpis);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const toast = useToast();

  const kpiCards = useMemo(
    () => [
      { title: "Stock Accuracy", value: `${kpis.stockAccuracyPercent}%`, subtitle: "Target >= 98%" },
      { title: "Order Fill Rate", value: `${kpis.orderFillRate}%`, subtitle: "Service level by approved requisitions" },
      { title: "Stock-out Items", value: kpis.stockOutItems, subtitle: "Items under minimum level" },
      { title: "Open Requisitions", value: kpis.requisitionsSubmitted, subtitle: "Submitted pending full closure" },
      { title: "Approved Requisitions", value: kpis.requisitionsApproved, subtitle: "For current period" },
      { title: "Shrinkage Qty (30d)", value: kpis.shrinkageQuantity30Days, subtitle: "Loss, disposal, variance" }
    ],
    [kpis]
  );

  const onRefresh = () => {
    setKpis((previous) => ({
      ...previous,
      stockAccuracyPercent: Number((previous.stockAccuracyPercent + 0.03).toFixed(2))
    }));
  };

  const handleFormSuccess = (formName: string) => {
    toast.add(`${formName} submitted successfully`, "success");
    setActiveForm(null);
    onRefresh();
  };

  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="brand-mark">
          <img src="/logo (2).png" alt="DGC logo" />
          <div>
            <p className="eyebrow">Department of Government Chemist</p>
            <h1>Inventory Management System</h1>
            <p>Governance-first stores control, procurement linkage, IPSAS-ready inventory accounting.</p>
          </div>
        </div>
        <div className="security-pill">MFA protected | Full audit trail | Segregation of duties</div>
      </header>

      <div className="quick-actions">
        <button
          className="action action-primary"
          onClick={() => setActiveForm("requisition")}
          type="button"
        >
          + Create Requisition
        </button>
        <button
          className="action action-primary"
          onClick={() => setActiveForm("receiving")}
          type="button"
        >
          + Receive Goods
        </button>
        <button
          className="action action-primary"
          onClick={() => setActiveForm("issue")}
          type="button"
        >
          + Issue Stock
        </button>
        <button
          className="action action-primary"
          onClick={() => setActiveForm("transfer")}
          type="button"
        >
          + Transfer Stock
        </button>
        <button
          className="action action-primary"
          onClick={() => setActiveForm("adjustment")}
          type="button"
        >
          + Adjust Stock
        </button>
        <button
          className="action action-primary"
          onClick={() => setActiveForm("disposal")}
          type="button"
        >
          + Dispose Item
        </button>
        <button className="action action-secondary" onClick={onRefresh} type="button">
          🔄 Refresh Dashboard
        </button>
      </div>

      <section className="kpi-grid">
        {kpiCards.map((card) => (
          <KpiCard key={card.title} title={card.title} value={card.value} subtitle={card.subtitle} />
        ))}
      </section>

      <section className="split-grid">
        <DataTable title="Recent Stock Ledger" rows={sampleLedger} />
        <DataTable title="Compliance Alerts" rows={sampleAlerts} />
      </section>

      <TransactionList />

      <section className="policy-panel">
        <h2>Jamaica Public Sector Control Coverage</h2>
        <div className="policy-tags">
          <span>Acquisition to Disposal Lifecycle</span>
          <span>GoJ Financial Instructions Checks</span>
          <span>Inter-MDA FS Approval Control</span>
          <span>Non-exchange Fair Value Capture</span>
          <span>Document Chain Integrity</span>
          <span>Immutable Audit Evidence</span>
        </div>
      </section>

      {activeForm === "requisition" && (
        <RequisitionForm
          onSuccess={() => handleFormSuccess("Requisition")}
          onCancel={() => setActiveForm(null)}
        />
      )}
      {activeForm === "receiving" && (
        <ReceivingForm
          onSuccess={() => handleFormSuccess("Receipt")}
          onCancel={() => setActiveForm(null)}
        />
      )}
      {activeForm === "issue" && (
        <IssueForm
          onSuccess={() => handleFormSuccess("Issue")}
          onCancel={() => setActiveForm(null)}
        />
      )}
      {activeForm === "transfer" && (
        <TransferForm
          onSuccess={() => handleFormSuccess("Transfer")}
          onCancel={() => setActiveForm(null)}
        />
      )}
      {activeForm === "adjustment" && (
        <AdjustmentForm
          onSuccess={() => handleFormSuccess("Adjustment")}
          onCancel={() => setActiveForm(null)}
        />
      )}
      {activeForm === "disposal" && (
        <DisposalForm
          onSuccess={() => handleFormSuccess("Disposal")}
          onCancel={() => setActiveForm(null)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
