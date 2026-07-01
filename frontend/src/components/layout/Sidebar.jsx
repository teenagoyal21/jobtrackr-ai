import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  Settings,
  HelpCircle,
  Briefcase,
} from "lucide-react";

const items = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "add", label: "Add application", icon: PlusCircle },
  { view: "tasks", label: "Follow-ups", icon: ListChecks },
];

export default function Sidebar({ activeView, onSelect }) {
  return (
    <aside
      className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex"
      data-testid="sidebar"
    >
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Briefcase className="h-4 w-4" />
        </div>
        <span className="font-display text-2xl italic leading-none text-slate-900">
          jobtrackr
        </span>
      </div>

      <nav className="mt-10 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Workspace
        </p>
        {items.map((item) => {
          const active = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onSelect(item.view)}
              data-testid={`sidebar-${item.view}`}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 pt-6">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          <HelpCircle className="h-4 w-4" />
          Help & docs
        </button>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
