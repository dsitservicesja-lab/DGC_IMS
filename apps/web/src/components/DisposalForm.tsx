import React, { useEffect, useState } from "react";
import { apiClient } from "../api";
import { FormDialog } from "./FormDialog";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function DisposalForm({ onSuccess, onCancel }: Props) {
  const [items, setItems] = useState<Array<{ id: string; standardName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/items").then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading items...</div>;

  return (
    <FormDialog
      title="Dispose Stock"
      onCancel={onCancel}
      onSubmit={async (data) => {
        await apiClient.post("/disposals", {
          itemId: data.itemId,
          quantity: Number(data.quantity),
          locationId: data.locationId,
          method: data.method,
          surveyRecordReference: data.surveyRecordReference,
          recommendation: data.recommendation,
          authorityApprovalRef: data.authorityApprovalRef,
          proceeds: data.proceeds ? Number(data.proceeds) : undefined,
          evidenceAttachment: data.evidenceAttachment
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
          label: "Quantity to Dispose",
          type: "number",
          required: true
        },
        {
          name: "locationId",
          label: "Current Location",
          type: "select",
          required: true,
          options: [{ label: "DGC Central Store", value: "central-store-id" }]
        },
        {
          name: "method",
          label: "Method of Disposal",
          type: "select",
          required: true,
          options: [
            { label: "Destruction", value: "DESTRUCTION" },
            { label: "Auction", value: "AUCTION" },
            { label: "Transfer", value: "TRANSFER" },
            { label: "Donation", value: "DONATION" },
            { label: "Return to Supplier", value: "RETURN_SUPPLIER" },
            { label: "Scrap", value: "SCRAP" }
          ]
        },
        {
          name: "surveyRecordReference",
          label: "Survey Record Reference",
          type: "text",
          required: true
        },
        {
          name: "recommendation",
          label: "Disposal Recommendation",
          type: "textarea",
          required: true
        },
        {
          name: "authorityApprovalRef",
          label: "Authority Approval Reference",
          type: "text",
          required: true
        },
        {
          name: "proceeds",
          label: "Proceeds from Disposal (if applicable)",
          type: "number"
        },
        {
          name: "evidenceAttachment",
          label: "Evidence/Documentation Reference",
          type: "text"
        }
      ]}
      submitLabel="Complete Disposal"
    />
  );
}
