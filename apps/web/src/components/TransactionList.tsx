import React, { useEffect, useState } from "react";
import { apiClient } from "../api";
import { useToast } from "./Toast";

type Transaction = {
  id: string;
  type: string;
  itemId: string;
  quantity: number;
  status: string;
  createdAt: string;
};

export function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get("/transactions?limit=50");
      setTransactions(data);
    } catch (err) {
      toast.add(
        err instanceof Error ? err.message : "Failed to load transactions",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  if (loading) return <div>Loading transactions...</div>;

  return (
    <div className="table-shell">
      <div className="table-header">
        <h3>Recent Transactions</h3>
        <button
          onClick={loadTransactions}
          className="action action-secondary"
          type="button"
        >
          Refresh
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                  No transactions yet
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.type}</td>
                  <td>{t.itemId}</td>
                  <td>{t.quantity}</td>
                  <td>{t.status}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
