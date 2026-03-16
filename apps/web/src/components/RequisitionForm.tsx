import React, { useEffect, useState } from "react";
import { apiClient } from "../api";
import { FormDialog } from "./FormDialog";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function RequisitionForm({ onSuccess, onCancel }: Props) {
  const [items, setItems] = useState<Array<{ id: string; standardName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/items").then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading items...</div>;

  return (
    <FormDialog
      title="Create Requisition"
      onCancel={onCancel}
      onSubmit={async (data) => {
        await apiClient.post("/requisitions", {
          itemId: data.itemId,
          quantity: Number(data.quantity),
          costCentre: data.costCentre,
          intendedUse: data.intendedUse,
          urgency: data.urgency,
          justification: data.justification,
          destinationLocationId: data.destinationLocationId,
          emergencyFlag: data.emergencyFlag === "true",
          emergencyReasonCode: data.emergencyReasonCode
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
          name: "quantity",
          label: "Quantity",
          type: "number",
          required: true
        },
        {
          name: "costCentre",
          label: "Cost Centre",
          type: "text",
          required: true
        },
        {
          name: "intendedUse",
          label: "Intended Use",
          type: "text",
          required: true
        },
        {
          name: "urgency",
          label: "Urgency",
          type: "select",
          required: true,
          options: [
            { label: "Low", value: "LOW" },
            { label: "Normal", value: "NORMAL" },
            { label: "High", value: "HIGH" },
            { label: "Emergency", value: "EMERGENCY" }
          ]
        },
        {
          name: "justification",
          label: "Justification",
          type: "textarea",
          required: true
        },
        {
          name: "destinationLocationId",
          label: "Destination Location",
          type: "select",
          required: true,
          options: [{ label: "DGC Central Store", value: "central-store-id" }]
        },
        {
          name: "emergencyFlag",
          label: "Emergency Order",
          type: "select",
          options: [
            { label: "No", value: "false" },
            { label: "Yes", value: "true" }
          ]
        },
        {
          name: "emergencyReasonCode",
          label: "Emergency Reason (if applicable)",
          type: "text"
        }
      ]}
      submitLabel="Submit Requisition"
    />
  );
}
