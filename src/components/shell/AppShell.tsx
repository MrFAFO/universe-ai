import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function AppShell({ children, rightPanel }: AppShellProps) {
  return (
      <div className="app-shell min-h-screen">
      <Sidebar />

      <div className="flex min-h-screen md:pl-[var(--sidebar-width)]">
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex flex-1 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
            {rightPanel}
          </main>
        </div>
      </div>
    </div>
  );
}
