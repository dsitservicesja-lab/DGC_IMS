import React, { useState } from "react";
import { apiClient } from "../api";

type Props = {
  token: string;
  onDone: () => void;
};

export function ResetPasswordPage({ token, onDone }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo (2).png" alt="DGC logo" className="login-logo" />
          <p className="eyebrow">Department of Government Chemist</p>
          <h1>Reset Your Password</h1>
          <p className="login-subtitle">Enter a new password below</p>
        </div>

        {success ? (
          <div className="login-form">
            <div className="form-success">Password has been reset successfully.</div>
            <button type="button" className="btn-primary login-btn" onClick={onDone}>
              Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn-primary login-btn" disabled={loading}>
              {loading ? "Resetting..." : "Set New Password"}
            </button>
          </form>
        )}

        <div className="login-footer">
          <button type="button" className="link-btn" onClick={onDone}>
            &larr; Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
