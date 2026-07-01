const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export const api = {
  listApplications: () => request("/applications"),
  createApplication: (payload) =>
    request("/applications", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateStatus: (id, status) =>
    request(`/applications/${id}/status?status=${encodeURIComponent(status)}`, {
      method: "PATCH",
    }),
  draftFollowup: (application_id, tone = "polite") =>
    request("/followup", {
      method: "POST",
      body: JSON.stringify({ application_id, tone }),
    }),
  listTasks: () => request("/tasks"),
};
