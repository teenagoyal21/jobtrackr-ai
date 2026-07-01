import { useState, useEffect, useCallback } from "react";
import { Briefcase, Sparkles, Loader2, Send } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/hooks/api";

const STATUS_TONE = {
  applied: "blue",
  interview: "amber",
  offer: "emerald",
  rejected: "rose",
};

function StatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONE[status] || "slate"} className="capitalize">
      {status}
    </Badge>
  );
}

function AddApplicationForm({ onCreated }) {
  const [form, setForm] = useState({
    company: "",
    role: "",
    source: "manual",
    job_description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company || !form.role) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createApplication(form);
      onCreated(created);
      setForm({ company: "", role: "", source: "manual", job_description: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium text-slate-900">Add application</h2>
        <p className="mt-1 text-sm text-slate-500">
          Paste the job description and the jd_parser agent will extract
          requirements and resume gaps automatically.
        </p>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Company</label>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="Acme Inc."
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Role</label>
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="AI Product Engineer"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Source</label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="manual">Manual</option>
              <option value="referral">Referral</option>
              <option value="linkedin">LinkedIn</option>
              <option value="portal">Job portal</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Job description (optional, paste full text)
            </label>
            <textarea
              value={form.job_description}
              onChange={(e) =>
                setForm({ ...form, job_description: e.target.value })
              }
              rows={6}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              placeholder="Paste the JD here…"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Parsing with agent…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Add & analyze
              </>
            )}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function ApplicationRow({ app, onStatusChange, onDraftFollowup, drafting }) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-400" />
              <h3 className="font-medium text-slate-900">{app.role}</h3>
            </div>
            <p className="text-sm text-slate-500">{app.company}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {app.jd_summary && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Requirements summary</p>
            <p className="mt-1 whitespace-pre-wrap">{app.jd_summary}</p>
          </div>
        )}
        {app.resume_gaps && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-medium">Resume gaps to address</p>
            <p className="mt-1 whitespace-pre-wrap">{app.resume_gaps}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select
            value={app.status}
            onChange={(e) => onStatusChange(app.id, e.target.value)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs"
          >
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onDraftFollowup(app.id)}
            disabled={drafting === app.id}
          >
            {drafting === app.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Draft follow-up
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default function Dashboard() {
  const [view, setView] = useState("dashboard");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drafting, setDrafting] = useState(null);
  const [followupDraft, setFollowupDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listApplications();
      setApplications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreated = (created) => {
    setApplications((prev) => [created, ...prev]);
    setView("dashboard");
  };

  const handleStatusChange = async (id, status) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    try {
      await api.updateStatus(id, status);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDraftFollowup = async (id) => {
    setDrafting(id);
    setFollowupDraft(null);
    try {
      const res = await api.draftFollowup(id);
      setFollowupDraft(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setDrafting(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeView={view} onSelect={setView} />
      <div className="flex flex-1 flex-col">
        <Topbar appCount={applications.length} />

        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {followupDraft && (
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardBody>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Follow-up drafted by agent
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                    {followupDraft.draft}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3"
                    onClick={() => setFollowupDraft(null)}
                  >
                    Dismiss
                  </Button>
                </CardBody>
              </Card>
            )}

            {view === "add" && <AddApplicationForm onCreated={handleCreated} />}

            {view !== "add" && (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold text-slate-900">
                    Your applications
                  </h1>
                  <Button size="sm" onClick={() => setView("add")}>
                    Add application
                  </Button>
                </div>

                {loading ? (
                  <p className="text-sm text-slate-500">Loading…</p>
                ) : applications.length === 0 ? (
                  <EmptyState
                    title="No applications tracked yet"
                    description="Add your first job application and the jd_parser agent will summarize requirements and flag resume gaps automatically."
                    action={
                      <Button onClick={() => setView("add")}>
                        Add your first application
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <ApplicationRow
                        key={app.id}
                        app={app}
                        onStatusChange={handleStatusChange}
                        onDraftFollowup={handleDraftFollowup}
                        drafting={drafting}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
