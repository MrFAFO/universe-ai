import {
  Globe,
  LayoutGrid,
  Map,
  Orbit,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "Universe", href: "/", icon: Orbit, active: true },
  { label: "Worlds", href: "/", icon: Globe, active: false },
  { label: "Map", href: "/", icon: Map, active: false },
  { label: "Settings", href: "/", icon: Settings, active: false },
];

export function Sidebar() {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col border-r border-border bg-surface md:flex"
      aria-label="Main navigation"
    >
      <div className="flex h-[var(--header-height)] items-center gap-3 border-b border-border px-5">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-elevated shadow-[var(--inner-glow)]">
          <LayoutGrid className="size-[18px] text-accent" strokeWidth={1.75} />
        </div>
        <span className="text-base font-semibold tracking-tight text-text-primary">
          Universe AI
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-base transition-colors ${
              item.active
                ? "border border-accent/20 bg-accent-muted text-text-primary shadow-[var(--inner-glow)]"
                : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            }`}
            aria-current={item.active ? "page" : undefined}
          >
            <item.icon className="size-5 shrink-0" strokeWidth={1.75} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-elevated px-3.5 py-2.5 text-sm font-medium text-text-secondary shadow-[var(--inner-glow)] transition-colors hover:border-accent/25 hover:text-text-primary"
        >
          <Plus className="size-4" strokeWidth={1.75} />
          New World
        </button>
      </div>
    </aside>
  );
}
