import { Search } from "lucide-react";

export default function Topbar({ appCount }) {
  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur"
      data-testid="topbar"
    >
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Pod
        </span>
        <span className="text-sm font-medium text-slate-900">
          jobtrackr-ai
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
        <span className="hidden text-xs text-slate-500 sm:block">
          {appCount} tracked application{appCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="hidden flex-1 px-10 md:flex">
        <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-slate-200 bg-slate-50/60 px-4 py-1.5 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <span>Search applications…</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-950 text-xs font-semibold text-white">
          YOU
        </div>
      </div>
    </header>
  );
}
