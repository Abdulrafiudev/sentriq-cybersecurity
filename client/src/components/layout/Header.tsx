"use client";

import { useRouter, usePathname } from "next/navigation";
import { SCREEN_TITLES } from "@/config/nav";
import { Button } from "@/components/ui/primitives";
import { usePageMetaValue } from "./PageMeta";
import { useDashboardStats } from "@/hooks/useDashboard";
import { formatRelative } from "@/lib/format";

function screenTitleFor(pathname: string): string {
  if (pathname.startsWith("/incidents/")) return "Incident detail";
  return SCREEN_TITLES[pathname] ?? "Sentriq";
}

export function Header({ onOpenNav }: { onOpenNav: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { title, meta } = usePageMetaValue();
  const { data: stats, dataUpdatedAt } = useDashboardStats();

  const defaultMeta =
    pathname === "/submit"
      ? stats?.pipeline.engine === "llm"
        ? "HYBRID RULES + LLM"
        : "RULES ENGINE — NO LLM KEY"
      : dataUpdatedAt
        ? `UPDATED ${formatRelative(new Date(dataUpdatedAt).toISOString()).toUpperCase()}`
        : "";

  return (
    <header className="sticky-blur sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8">
      <div className="flex min-w-0 items-baseline gap-3">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="-ml-1 cursor-pointer rounded-lg px-2 py-1 text-ink-muted hover:bg-hover hover:text-ink lg:hidden"
        >
          ☰
        </button>
        <h1 className="font-display text-[19px] font-semibold tracking-[-0.02em] text-ink">
          {title ?? screenTitleFor(pathname)}
        </h1>
        <span className="machine hidden whitespace-nowrap text-[11px] text-ink-disabled sm:inline">
          {meta ?? defaultMeta}
        </span>
      </div>

      <div className="flex items-center gap-[10px]">
        <span
          title="Reports are accepted in English and Nigerian Pidgin"
          className="machine hidden rounded-[var(--radius-control)] border border-line bg-surface px-[11px] py-[7px] text-[11px] text-ink-muted sm:block"
        >
          EN / PIDGIN
        </span>
        <Button onClick={() => router.push("/submit")}>New report</Button>
      </div>
    </header>
  );
}
