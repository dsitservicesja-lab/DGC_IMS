import React, { useEffect, useState } from "react";
import { apiClient } from "../api";
import { FormDialog } from "./FormDialog";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function ReceivingForm({ onSuccess, onCancel }: Props) {
  const [items, setItems] = useState<Array<{ id: string; standardName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/items").then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading items...</div>;

  return (
    <FormDialog
      title="Receive Goods"
      onCancel={onCancel}
      onSubmit={async (data) => {
        await apiClient.post("/transactions/receiving", {
          poNumber: data.poNumber,
          donorSource: data.donorSource,
          itemId: data.itemId,
          receivedLocationId: data.receivedLocationId,
          quantityOrdered: Number(data.quantityOrdered),
          quantityReceived: Number(data.quantityReceived),
          quantityAccepted: Number(data.quantityAccepted),
          quantityRejected: Number(data.quantityRejected),
          quantityDamaged: Number(data.quantityDamaged || 0),
          lotBatchNumber: data.lotBatchNumber,
          serialNumber: data.serialNumber,
          expiryDate: data.expiryDate,
          inspectionResult: data.inspectionResult,
          quarantineRequired: data.quarantineRequired === "true",
          fairValue: data.fairValue ? Number(data.fairValue) : undefined,
          valuationBasis: data.valuationBasis
        });
        onSuccess();
      }}
      fields={[
        {
          name: "poNumber",
          label: "PO Number (or leave empty for donation)",
          type: "text"
        },
        {
          name: "donorSource",
          label: "Donor Source (if applicable)",
          type: "text"
        },
        {
          name: "itemId",
          label: "Item",
          type: "select",
          required: true,
          options: items.map((i) => ({ label: i.standardName, value: i.id }))
        },
        {
          name: "receivedLocationId",
          label: "Receiving Location",
          type: "select",
          required: true,
          options: [{ label: "DGC Central Store", value: "central-store-id" }]
        },
        {
          name: "quantityOrdered",
          label: "Quantity Ordered",
          type: "number",
          required: true
        },
        {
          name: "quantityReceived",
          label: "Quantity Received",
          type: "number",
          required: true
        },
        {
          name: "quantityAccepted",
          label: "Quantity Accepted",
          type: "number",
          required: true
        },
        {
          name: "quantityRejected",
          label: "Quantity Rejected",
          type: "number"
        },
        {
          name: "quantityDamaged",
          label: "Quantity Damaged",
          type: "number"
        },
        {
          name: "lotBatchNumber",
          label: "Lot/Batch Number",
          type: "text"
        },
        {
          name: "serialNumber",
          label: "Serial Number",
          type: "text"
        },
        {
          name: "expiryDate",
          label: "Expiry Date",
          type: "date"
        },
        {
          name: "inspectionResult",
          label: "Inspection Result",
          type: "text",
          required: true
        },
        {
          name: "quarantineRequired",
          label: "Quarantine Required",
          type: "select",
          options: [
            { label: "No", value: "false" },
            { label: "Yes", value: "true" }
          ]
        },
        {
          name: "fairValue",
          label: "Fair Value (for donations)",
          type: "number"
        },
        {
          name: "valuationBasis",
          label: "Valuation Basis",
          type: "text"
        }
      ]}
      submitLabel="Complete Receipt"
    />
  );
}
