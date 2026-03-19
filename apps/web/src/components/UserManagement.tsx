import React, { useEffect, useState } from "react";
import { apiClient } from "../api";
import { useToast } from "./Toast";

type User = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  approvalLevel: number;
  isActive: boolean;
  createdAt: string;
};

const ROLES = [
  "SYSTEM_ADMIN",
  "ACCOUNTING_OFFICER",
  "ASSET_MANAGER",
  "STOREKEEPER",
  "REQUISITIONING_OFFICER",
  "RECEIVING_OFFICER",
  "APPROVING_OFFICER",
  "PROCUREMENT_OFFICER",
  "FINANCE_OFFICER",
  "DISPOSAL_AUTHORITY",
  "INTERNAL_AUDITOR",
  "CUSTODIAN"
];

const roleLabel = (role: string) =>
  role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type Props = {
  onClose: () => void;
};

export function UserManagement({ onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const toast = useToast();

  const fetchUsers = async () => {
    try {
      const data = await apiClient.get("/users");
      setUsers(data);
    } catch (err) {
      toast.add("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (user: User) => {
    try {
      await apiClient.put(`/users/${user.id}`, { isActive: !user.isActive });
      toast.add(`User ${user.isActive ? "deactivated" : "activated"}`, "success");
      fetchUsers();
    } catch (err) {
      toast.add("Failed to update user", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!resetId || newPassword.length < 8) return;
    try {
      await apiClient.post(`/users/${resetId}/reset-password`, { newPassword });
      toast.add("Password reset successfully", "success");
      setResetId(null);
      setNewPassword("");
    } catch (err) {
      toast.add("Failed to reset password", "error");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ width: "min(900px, 95vw)" }}>
        <div className="modal-header">
          <h2>User Management</h2>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="modal-form">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ margin: 0, color: "#486174" }}>{users.length} users</p>
            <button className="btn-primary" onClick={() => { setEditUser(null); setShowForm(true); }}>
              + Add User
            </button>
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                      <td>{u.employeeId}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className="role-badge">{roleLabel(u.role)}</span></td>
                      <td>{u.department}</td>
                      <td>{u.approvalLevel}</td>
                      <td>
                        <span className={u.isActive ? "status-active" : "status-inactive"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="btn-sm"
                            onClick={() => { setEditUser(u); setShowForm(true); }}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-sm"
                            onClick={() => handleToggleActive(u)}
                            title={u.isActive ? "Deactivate" : "Activate"}
                          >
                            {u.isActive ? "🔒" : "🔓"}
                          </button>
                          <button
                            className="btn-sm"
                            onClick={() => setResetId(u.id)}
                            title="Reset Password"
                          >
                            🔑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reset password mini-dialog */}
        {resetId && (
          <div className="modal-overlay" onClick={() => setResetId(null)}>
            <div className="modal-dialog" style={{ width: 380 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Reset Password</h2>
                <button className="modal-close" onClick={() => setResetId(null)} type="button">✕</button>
              </div>
              <div className="modal-form">
                <div className="form-group">
                  <label htmlFor="new-pw">New Password (min 8 chars)</label>
                  <input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setResetId(null)}>Cancel</button>
                <button className="btn-primary" onClick={handleResetPassword} disabled={newPassword.length < 8}>
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit user form */}
        {showForm && (
          <UserForm
            user={editUser}
            onSaved={() => { setShowForm(false); setEditUser(null); fetchUsers(); }}
            onCancel={() => { setShowForm(false); setEditUser(null); }}
          />
        )}
      </div>
    </div>
  );
}

function UserForm({ user, onSaved, onCancel }: { user: User | null; onSaved: () => void; onCancel: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: user?.employeeId || "",
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    role: user?.role || "REQUISITIONING_OFFICER",
    department: user?.department || "Department of Government Chemist",
    approvalLevel: user?.approvalLevel || 1
  });

  const set = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (user) {
        const payload: Record<string, unknown> = {
          employeeId: form.employeeId,
          name: form.name,
          email: form.email,
          role: form.role,
          department: form.department,
          approvalLevel: form.approvalLevel
        };
        if (form.password) {
          payload.password = form.password;
        }
        await apiClient.put(`/users/${user.id}`, payload);
        toast.add("User updated", "success");
      } else {
        await apiClient.post("/users", form);
        toast.add("User created", "success");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{user ? "Edit User" : "Create User"}</h2>
          <button className="modal-close" onClick={onCancel} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="uf-eid">Employee ID</label>
            <input id="uf-eid" value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="uf-name">Full Name</label>
            <input id="uf-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="uf-email">Email</label>
            <input id="uf-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="uf-pw">{user ? "Password (leave blank to keep current)" : "Password (min 8 characters)"}</label>
            <input id="uf-pw" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required={!user} minLength={8} />
          </div>

          <div className="form-group">
            <label htmlFor="uf-role">Role</label>
            <select id="uf-role" value={form.role} onChange={(e) => set("role", e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="uf-dept">Department</label>
            <input id="uf-dept" value={form.department} onChange={(e) => set("department", e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="uf-lvl">Approval Level (1-5)</label>
            <input id="uf-lvl" type="number" min={1} max={5} value={form.approvalLevel} onChange={(e) => set("approvalLevel", Number(e.target.value))} />
          </div>
        </form>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn-primary" onClick={(e) => { e.preventDefault(); const f = document.querySelector<HTMLFormElement>(".modal-form form"); if (f) f.requestSubmit(); else handleSubmit(e as any); }} disabled={loading}>
            {loading ? "Saving..." : user ? "Update User" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}
