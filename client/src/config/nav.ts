export interface NavItem {
  label: string;
  href: string;
  /** Extra path prefixes that should keep this item highlighted. */
  matches?: string[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Incident detail lives under the queue, so the queue stays lit while reading one.
 *
 * Evaluation, routing rules and the design-system sheet are deliberately not in
 * the sidebar — they are reference material rather than daily triage. The routes
 * still exist at /evaluation, /routing-rules and /design-system.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "TRIAGE",
    items: [
      { label: "Overview", href: "/" },
      { label: "Incident queue", href: "/incidents", matches: ["/incidents"] },
      { label: "Submit report", href: "/submit" },
    ],
  },
];

export const SCREEN_TITLES: Record<string, string> = {
  "/": "Triage overview",
  "/incidents": "Incident queue",
  "/submit": "Submit report",
  "/evaluation": "Evaluation",
  "/routing-rules": "Routing rules",
  "/design-system": "Design system",
};
