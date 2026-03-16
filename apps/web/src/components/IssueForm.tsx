import React, { useEffect, useState } from "react";
import { apiClient } from "../api";
import { FormDialog } from "./FormDialog";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function IssueForm({ onSuccess, onCancel }: Props) {
  const [items, setItems] = useState<Array<{ id: string; standardName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/items").then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading items...</div>;

  return (
    <FormDialog
      title="Issue Stock"
      onCancel={onCancel}
      onSubmit={async (data) => {
        await apiClient.post("/transactions/issue", {
          itemId: data.itemId,
          fromLocationId: data.fromLocationId,
          quantity: Number(data.quantity),
          reasonCode: data.reasonCode,
          issueToType: data.issueToType,
          issueToReference: data.issueToReference,
          acknowledgement: data.acknowledgement
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
          name: "fromLocationId",
          label: "From Location",
          type: "select",
          required: true,
          options: [{ label: "DGC Central Store", value: "central-store-id" }]
        },
        {
          name: "quantity",
          label: "Quantity to Issue",
          type: "number",
          required: true
        },
        {
          name: "reasonCode",
          label: "Reason for Issue",
          type: "textarea",
          required: true
        },
        {
          name: "issueToType",
          label: "Issue To (Type)",
          type: "select",
          required: true,
          options: [
            { label: "Person", value: "PERSON" },
            { label: "Department", value: "DEPARTMENT" },
            { label: "Project", value: "PROJECT" },
            { label: "Event", value: "EVENT" },
            { label: "Vehicle", value: "VEHICLE" },
            { label: "Building", value: "BUILDING" },
            { label: "Room", value: "ROOM" }
          ]
        },
        {
          name: "issueToReference",
          label: "Issue To (Reference/Name)",
          type: "text",
          required: true
        },
        {
          name: "acknowledgement",
          label: "Recipient Acknowledgement",
          type: "text",
          required: true
        }
      ]}
      submitLabel="Issue Stock"
    />
  );
}
