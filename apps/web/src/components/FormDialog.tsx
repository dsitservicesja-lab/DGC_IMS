import React, { useState } from "react";

type Props = {
  title: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "number" | "select" | "textarea" | "date";
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
  submitLabel?: string;
};

export function FormDialog({ title, onSubmit, onCancel, fields, submitLabel = "Submit" }: Props) {
  const [formData, setFormData] = useState<Record<string, unknown>>(
    fields.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {})
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onCancel} type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {fields.map((field) => (
            <div key={field.name} className="form-group">
              <label htmlFor={field.name}>{field.label}</label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  value={String(formData[field.name] || "")}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  rows={4}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.name}
                  value={String(formData[field.name] || "")}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.name}
                  type={field.type}
                  value={String(formData[field.name] || "")}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                />
              )}
            </div>
          ))}

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Submitting..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
