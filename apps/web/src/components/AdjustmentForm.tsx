import React, { useEffect, useState } from "react";
import { apiClient } from "../api";
import { FormDialog } from "./FormDialog";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function AdjustmentForm({ onSuccess, onCancel }: Props) {
  const [items, setItems] = useState<Array<{ id: string; standardName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/items").then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading items...</div>;

  return (
    <FormDialog
      title="Adjust Stock"
      onCancel={onCancel}
      onSubmit={async (data) => {
        await apiClient.post("/transactions/adjustment", {
          itemId: data.itemId,
          locationId: data.locationId,
          quantity: Number(data.quantity),
          reasonCode: data.reasonCode,
          approvalReference: data.approvalReference
        });
        onSuccess();
      }}
      fields={[
        {
          name: "itemId",
          label: "Item",
          type: "select",
          required: true,
          options: items.map((i) => ({ label: i.standardName, value: i.id }))
        },
        {
          name: "locationId",
          label: "Location",
          type: "select",
          required: true,
          options: [{ label: "DGC Central Store", value: "central-store-id" }]
        },
        {
          name: "quantity",
          label: "Adjustment Quantity (positive for gain, negative for loss)",
          type: "number",
          required: true
        },
        {
          name: "reasonCode",
          label: "Reason",
          type: "select",
          required: true,
          options: [
            { label: "Damage", value: "DAMAGE" },
            { label: "Expiry", value: "EXPIRY" },
            { label: "Count Variance", value: "COUNT_VARIANCE" },
            { label: "Breakage", value: "BREAKAGE" },
            { label: "Theft", value: "THEFT" },
            { label: "Administrative Correction", value: "ADMIN_CORRECTION" }
          ]
        },
        {
          name: "approvalReference",
          label: "Approval/Authorization Reference",
          type: "text",
          required: true
        }
      ]}
      submitLabel="Complete Adjustment"
    />
  );
}
