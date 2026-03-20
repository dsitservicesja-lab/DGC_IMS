import React, { useState } from "react";
import { apiClient } from "../api";

type Props = {
  onLogin: (user: { id: string; name: string; role: string }, token: string) => void;
};

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      onLogin(res.user, res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    try {
      await apiClient.post("/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <img src="/logo (2).png" alt="DGC logo" className="login-logo" />
            <p className="eyebrow">Department of Government Chemist</p>
            <h1>Forgot Password</h1>
            <p className="login-subtitle">Enter your email to receive a reset link</p>
          </div>

          {forgotSent ? (
            <div className="login-form">
              <div className="form-success">
                If that email is registered, a password reset link has been sent.
                Please check your inbox.
              </div>
              <button
                type="button"
                className="btn-primary login-btn"
                onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="login-form">
              {forgotError && <div className="form-error">{forgotError}</div>}
              <div className="form-group">
                <label htmlFor="forgot-email">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@dgc.gov.jm"
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary login-btn" disabled={forgotLoading}>
                {forgotLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="login-footer">
            <button
              type="button"
              className="link-btn"
              onClick={() => { setShowForgot(false); setForgotError(null); setForgotSent(false); }}
            >
              &larr; Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo (2).png" alt="DGC logo" className="login-logo" />
          <p className="eyebrow">Department of Government Chemist</p>
          <h1>Inventory Management System</h1>
          <p className="login-subtitle">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@dgc.gov.jm"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={8}
            />
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="forgot-link">
            <button type="button" className="link-btn" onClick={() => setShowForgot(true)}>
              Forgot your password?
            </button>
          </div>
        </form>

        <div className="login-footer">
          <div className="security-pill">MFA protected | Full audit trail | Segregation of duties</div>
        </div>
      </div>
    </div>
  );
}
