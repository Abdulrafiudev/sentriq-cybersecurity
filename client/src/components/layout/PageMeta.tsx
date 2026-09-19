"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The header shows a screen title plus a mono meta line. Most screens are static,
 * but incident detail needs to publish "INC-104 · SOC / Phishing" once its data
 * arrives, so pages push their own values here rather than the header guessing.
 */

interface PageMetaValue {
  title: string | null;
  meta: string | null;
  setPageMeta: (value: { title?: string | null; meta?: string | null }) => void;
}

const PageMetaContext = createContext<PageMetaValue | null>(null);

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const [meta, setMeta] = useState<string | null>(null);

  const value = useMemo<PageMetaValue>(
    () => ({
      title,
      meta,
      setPageMeta: ({ title: nextTitle, meta: nextMeta }) => {
        if (nextTitle !== undefined) setTitle(nextTitle);
        if (nextMeta !== undefined) setMeta(nextMeta);
      },
    }),
    [title, meta],
  );

  return <PageMetaContext.Provider value={value}>{children}</PageMetaContext.Provider>;
}

export function usePageMetaValue() {
  const context = useContext(PageMetaContext);
  if (!context) throw new Error("usePageMetaValue must be used inside PageMetaProvider");
  return context;
}

/** Declarative setter for a screen. Clears on unmount so the next screen is clean. */
export function usePageMeta(input: { title?: string | null; meta?: string | null }) {
  const { setPageMeta } = usePageMetaValue();
  const { title, meta } = input;

  useEffect(() => {
    setPageMeta({ title: title ?? null, meta: meta ?? null });
    return () => setPageMeta({ title: null, meta: null });
  }, [title, meta, setPageMeta]);
}
