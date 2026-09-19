"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarContent } from "./Sidebar";
import { Header } from "./Header";
import { PageMetaProvider } from "./PageMeta";

/**
 * Two-column shell: a 230px sticky sidebar and the scrolling screen.
 *
 * Below the lg breakpoint the sidebar becomes a drawer — the handoff flagged this
 * as undesigned, so it reuses the same nav content behind a scrim rather than
 * inventing a second navigation pattern.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  /**
   * The drawer is stored as the route it was opened on rather than a boolean, so
   * navigating away closes it during render instead of through an effect that
   * would paint the old state for a frame first.
   */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const navOpen = openedAt === pathname;
  const setNavOpen = (open: boolean) => setOpenedAt(open ? pathname : null);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <PageMetaProvider>
      <div className="grid min-h-screen grid-cols-1 items-stretch lg:grid-cols-[230px_minmax(0,1fr)]">
        <Sidebar />

        {navOpen ? (
          <div className="fixed inset-0 z-30 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="absolute inset-0 cursor-default bg-[rgb(20_23_21/0.28)]"
            />
            <div className="absolute inset-y-0 left-0 w-[250px] border-r border-line shadow-[var(--shadow-raised)]">
              <SidebarContent onNavigate={() => setNavOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 pb-16">
          <Header onOpenNav={() => setNavOpen(true)} />
          {children}
        </main>
      </div>
    </PageMetaProvider>
  );
}
