import React, { useEffect, useState } from "react";
import { apiClient } from "../api";
import { FormDialog } from "./FormDialog";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function TransferForm({ onSuccess, onCancel }: Props) {
  const [items, setItems] = useState<Array<{ id: string; standardName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/items").then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading items...</div>;

  return (
    <FormDialog
      title="Transfer Stock"
      onCancel={onCancel}
      onSubmit={async (data) => {
        await apiClient.post("/transactions/transfer", {
          itemId: data.itemId,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          quantity: Number(data.quantity),
          destinationIsExternalMda: data.destinationIsExternalMda === "true",
          fsApprovalReference: data.fsApprovalReference,
          transferDocumentReference: data.transferDocumentReference
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
          name: "toLocationId",
          label: "To Location",
          type: "select",
          required: true,
          options: [{ label: "DGC Central Store", value: "central-store-id" }]
        },
        {
          name: "quantity",
          label: "Quantity to Transfer",
          type: "number",
          required: true
        },
        {
          name: "destinationIsExternalMda",
          label: "External MDA (Inter-Ministry Transfer)",
          type: "select",
          required: true,
          options: [
            { label: "Internal Transfer", value: "false" },
            { label: "External MDA", value: "true" }
          ]
        },
        {
          name: "fsApprovalReference",
          label: "FS Approval Reference (if external MDA)",
          type: "text"
        },
        {
          name: "transferDocumentReference",
          label: "Transfer Document Reference",
          type: "text",
          required: true
        }
      ]}
      submitLabel="Execute Transfer"
    />
  );
}
