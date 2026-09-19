"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/config/nav";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { formatDuration } from "@/lib/format";

function isActive(pathname: string, href: string, matches?: string[]): boolean {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  return (matches ?? []).some((prefix) => pathname.startsWith(prefix));
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: stats } = useDashboardStats();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  const median = stats?.performance.medianTriageMs;

  return (
    <div className="flex h-full flex-col gap-[26px] bg-surface px-4 py-[22px]">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-[10px] px-[6px]">
        <span className="grid size-[26px] place-items-center rounded-lg bg-[linear-gradient(140deg,#13A272,#0A6B4C)]">
          <span className="size-2 rounded-[2px] bg-[#EAFBF3]" />
        </span>
        <span className="font-display text-base font-semibold tracking-[-0.02em] text-ink">
          Sentriq
        </span>
      </Link>

      <nav className="flex flex-col gap-[2px]">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.label} className="contents">
            <div
              className={cn(
                "machine px-2 pb-2 text-[10px] tracking-[0.14em] text-ink-disabled",
                sectionIndex > 0 && "pt-5",
              )}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = isActive(pathname, item.href, item.matches);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-[10px] py-[9px] text-[13px] transition-colors",
                    active
                      ? "bg-jade-50 font-medium text-jade-800 shadow-[inset_0_0_0_1px_var(--color-jade-200)]"
                      : "text-ink-muted hover:bg-hover hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-[10px]">
        <div className="rounded-xl border border-line bg-sunk p-3">
          <div className="machine flex items-center gap-[7px] text-[10.5px] tracking-[0.1em] text-ink-muted">
            <span className="size-[6px] animate-[var(--animate-sq-pulse)] rounded-full bg-jade-600" />
            PIPELINE LIVE
          </div>
          <div className="machine mt-2 text-[12px] text-ink">
            {median !== undefined ? formatDuration(median) : "—"}{" "}
            <span className="text-ink-disabled">median triage</span>
          </div>
        </div>

        <div className="flex items-center gap-[9px] px-[6px] py-1">
          <span className="machine grid size-[26px] place-items-center rounded-full border border-line bg-hover text-[11px] text-ink-muted">
            {initials(user?.name)}
          </span>
          <div className="min-w-0 leading-[1.25]">
            <div className="truncate text-[12.5px]">{user?.name ?? "Analyst"}</div>
            <button
              type="button"
              onClick={logout}
              className="cursor-pointer text-[11px] text-ink-disabled hover:text-ink-muted"
            >
              {user?.role === "lead" ? "IR lead · Sign out" : "SOC analyst · Sign out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function initials(name?: string): string {
  if (!name) return "AI";
  const parts = name.replace(/[^A-Za-z .]/g, "").split(/[ .]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "A";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase().slice(0, 2);
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-line lg:block">
      <SidebarContent />
    </aside>
  );
}
