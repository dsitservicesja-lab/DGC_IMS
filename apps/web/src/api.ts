export const apiClient = {
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000/api",

  async request(method: string, path: string, body?: unknown) {
    const token = localStorage.getItem("auth_token");
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  get(path: string) {
    return this.request("GET", path);
  },

  post(path: string, body: unknown) {
    return this.request("POST", path, body);
  },

  put(path: string, body: unknown) {
    return this.request("PUT", path, body);
  }
};
