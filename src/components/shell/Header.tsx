import { Bell, Plus, Search } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-5 border-b border-border bg-surface/90 px-6 backdrop-blur-md lg:px-9 xl:px-10">
      <div className="relative max-w-3xl flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted"
          strokeWidth={1.75}
        />
        <input
          type="search"
          placeholder="Search worlds, nodes, decisions…"
          className="w-full rounded-lg border border-border bg-surface-elevated py-3 pl-12 pr-4 text-base text-text-primary shadow-[var(--inner-glow)] placeholder:text-text-muted outline-none transition-colors focus:border-accent/35 focus:ring-1 focus:ring-accent/15"
          aria-label="Search"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-accent/90 sm:flex"
        >
          <Plus className="size-[18px]" strokeWidth={2} />
          New World
        </button>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-secondary shadow-[var(--inner-glow)] transition-colors hover:border-border-strong hover:text-text-primary"
          aria-label="Notifications"
        >
          <Bell className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
