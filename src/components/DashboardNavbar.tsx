interface DashboardNavbarProps {
  userName: string;
  title?: string;
  /** False (or empty) shows "Ready to track" until the account has activity. */
  hasData?: boolean;
}

export default function DashboardNavbar({
  userName,
  title = "Dashboard",
  hasData = true,
}: DashboardNavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          Personal
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>{hasData ? "Your financial data is up to date" : "Ready to track"}</span>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
          ₹ INR
        </div>

        <div className="flex items-center gap-2 pl-1">
          <div className="flex items-center gap-2 rounded-md p-1 pl-1.5 pr-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-xs font-medium text-slate-700 sm:block">
              {userName.split(" ")[0]}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
