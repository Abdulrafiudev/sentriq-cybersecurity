"use client";

import { useState } from "react";
import {
  Button,
  Eyebrow,
  FilterPill,
  IndicatorChip,
  Panel,
  PanelHeading,
  ProgressTrack,
  RedactedText,
  SegmentedOption,
  SeverityBadge,
  StatusPill,
} from "@/components/ui/primitives";
import { StatCard } from "@/components/dashboard/StatCard";
import { PipelineStepper } from "@/components/forms/PipelineStepper";
import { SEVERITY_BAR, SEVERITY_RULE } from "@/config/tokens";
import {
  INCIDENT_STATUSES,
  INDICATOR_TYPES,
  SEVERITY_LEVELS,
  type Severity,
} from "@/types/incident";

/**
 * The living component sheet. It renders the same components the product uses,
 * so it cannot drift from the app the way a static style guide would.
 */
export function DesignSystemSheet() {
  const [pill, setPill] = useState("All");
  const [segment, setSegment] = useState("Auto-detect");

  return (
    <div className="flex max-w-[1100px] flex-col gap-8 px-5 py-7 sm:px-8">
      <header className="flex flex-col gap-2">
        <Eyebrow>01 — Foundations</Eyebrow>
        <h2 className="font-display text-[30px] font-semibold tracking-[-0.03em] text-ink">
          Sentriq design system
        </h2>
        <p className="max-w-[660px] text-[13.5px] leading-[1.65] text-pretty text-ink-muted">
          Three colour roles and no exceptions. Neutrals carry the interface, Signal Jade
          always means &ldquo;the system&rdquo; — Sentriq&rsquo;s own actions, confidence and
          matches — and severity hues are the only other colours permitted. Jade never
          expresses severity.
        </p>
      </header>

      <Section eyebrow="02 — Colour" title="Surfaces, ink and signal">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[14px]">
          <Panel className="p-5">
            <Eyebrow>Neutrals</Eyebrow>
            <div className="mt-3 flex flex-col gap-2">
              <Swatch name="Paper" hex="#F7F7F4" />
              <Swatch name="Surface" hex="#FFFFFF" />
              <Swatch name="Surface sunk" hex="#FAFAF7" />
              <Swatch name="Line" hex="#E4E3DD" />
              <Swatch name="Ink" hex="#141715" />
              <Swatch name="Ink muted" hex="#5C615D" />
            </div>
          </Panel>

          <Panel className="p-5">
            <Eyebrow>Signal Jade</Eyebrow>
            <div className="mt-3 flex flex-col gap-2">
              <Swatch name="Jade 50" hex="#E4F5EC" />
              <Swatch name="Jade 100" hex="#F3FBF7" />
              <Swatch name="Jade 200" hex="#BFE6D4" />
              <Swatch name="Jade 600" hex="#0E7C5A" />
              <Swatch name="Jade 800" hex="#0A5F45" />
            </div>
          </Panel>

          <Panel className="p-5">
            <Eyebrow>Severity — and when to use it</Eyebrow>
            <div className="mt-3 flex flex-col gap-3">
              {SEVERITY_LEVELS.map((level) => (
                <div key={level} className="flex flex-col gap-1">
                  <SeverityBadge severity={level} className="w-fit" />
                  <p className="text-[12px] leading-[1.55] text-ink-faint">
                    {SEVERITY_RULE[level]}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Section>

      <Section eyebrow="03 — Primitives" title="Badges, buttons, fields">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[14px]">
          <Panel className="p-5">
            <Eyebrow>SeverityBadge</Eyebrow>
            <div className="mt-[14px] flex flex-wrap gap-2">
              {SEVERITY_LEVELS.map((level) => (
                <SeverityBadge key={level} severity={level} />
              ))}
            </div>

            <Eyebrow className="mt-[18px]">StatusPill</Eyebrow>
            <div className="mt-[14px] flex flex-wrap gap-2">
              {INCIDENT_STATUSES.map((status) => (
                <StatusPill key={status} status={status} />
              ))}
            </div>

            <Eyebrow className="mt-[18px]">Indicator chip</Eyebrow>
            <div className="mt-[14px] flex flex-wrap gap-2">
              {INDICATOR_TYPES.map((type) => (
                <IndicatorChip key={type} type={type} />
              ))}
            </div>

            <Eyebrow className="mt-[18px]">Redaction token</Eyebrow>
            <div className="machine mt-[14px] text-[12.5px] leading-[1.8] text-ink-body">
              <RedactedText text="The sender was [EMAIL_REDACTED] and [PHONE_REDACTED] called about [ORG_SYSTEM]." />
            </div>
          </Panel>

          <Panel className="p-5">
            <Eyebrow>Buttons</Eyebrow>
            <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
              <Button>Run triage</Button>
              <Button variant="secondary">Reassign</Button>
              <Button variant="escalate">Escalate</Button>
              <Button variant="tinted">Open incident →</Button>
              <Button variant="ghost">Dismiss</Button>
            </div>

            <Eyebrow className="mt-5">Filter pills</Eyebrow>
            <div className="mt-[14px] flex flex-wrap gap-2">
              {["All", "Critical", "High", "Unreviewed"].map((option) => (
                <FilterPill key={option} active={pill === option} onClick={() => setPill(option)}>
                  {option}
                </FilterPill>
              ))}
            </div>

            <Eyebrow className="mt-5">Segmented options</Eyebrow>
            <div className="mt-[14px] flex flex-wrap gap-2">
              {["Auto-detect", "English", "Nigerian Pidgin"].map((option) => (
                <SegmentedOption
                  key={option}
                  active={segment === option}
                  onClick={() => setSegment(option)}
                >
                  {option}
                </SegmentedOption>
              ))}
            </div>

            <Eyebrow className="mt-5">Report field</Eyebrow>
            <textarea
              rows={3}
              placeholder="Paste the report exactly as it was received…"
              className="machine mt-3 w-full resize-y rounded-[var(--radius-inner)] border border-line-strong bg-[#FCFCFA] p-3 text-[12.5px] leading-[1.7] text-ink outline-none focus:border-jade-600 focus:bg-surface"
            />
          </Panel>
        </div>
      </Section>

      <Section eyebrow="04 — Blocks" title="Composed components">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[14px]">
          <StatCard label="Total incidents" value="1,284" sub="+96 in last 24h" />
          <StatCard label="Critical" value="7" sub="4 awaiting analyst" tone="critical" />
          <StatCard label="High severity" value="38" sub="12 routed to Identity" tone="high" />
          <StatCard label="Duplicates merged" value="311" sub="24% of intake volume" tone="jade" />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[14px]">
          <Panel className="p-5">
            <PanelHeading>Severity bars</PanelHeading>
            <div className="mt-[14px] flex flex-col gap-[14px]">
              {(
                [
                  ["Critical", 8],
                  ["High", 34],
                  ["Medium", 58],
                  ["Low", 82],
                ] as Array<[Severity, number]>
              ).map(([level, value]) => (
                <div key={level} className="flex flex-col gap-[7px]">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-ink-body">{level}</span>
                    <span className="machine text-ink-faint">{value}</span>
                  </div>
                  <ProgressTrack value={value} barClassName={SEVERITY_BAR[level]} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeading>Related incident card</PanelHeading>
            <div className="mt-[14px] rounded-[var(--radius-inner)] border border-line-subtle bg-sunk p-3">
              <div className="flex items-center justify-between gap-[10px]">
                <span className="machine text-[12px] text-jade-600">INC-091</span>
                <span className="machine text-[11.5px] text-ink-faint">91%</span>
              </div>
              <div className="mt-2 text-[12.5px] text-ink-body">
                Same cloned bank portal reported by a branch officer
              </div>
              <ProgressTrack
                className="mt-[10px] bg-[#EDECE7]"
                height={4}
                value={91}
                barClassName="bg-jade-600"
              />
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-3">
          <Eyebrow>Pipeline stepper</Eyebrow>
          <PipelineStepper
            reached={4}
            running
            stages={[
              { key: "received", label: "Received", note: "0.0s", durationMs: 0 },
              { key: "redaction", label: "Redaction", note: "4 entities", durationMs: 120 },
              { key: "classify", label: "Classify", note: "Phishing", durationMs: 640 },
              { key: "indicators", label: "Indicators", note: "4 found", durationMs: 12 },
            ]}
          />
        </div>
      </Section>

      <Section eyebrow="05 — Space" title="Spacing, radius, elevation">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[14px]">
          <Panel className="p-5">
            <Eyebrow>Radius</Eyebrow>
            <div className="mt-[14px] flex flex-col gap-2 text-[12.5px] text-ink-body">
              <RadiusRow label="Chips / badges" px={6} />
              <RadiusRow label="Pills" px={7} />
              <RadiusRow label="Buttons" px={9} />
              <RadiusRow label="Inner cards" px={11} />
              <RadiusRow label="Cards" px={14} />
              <RadiusRow label="Submit-flow cards" px={16} />
            </div>
          </Panel>

          <Panel className="p-5">
            <Eyebrow>Elevation</Eyebrow>
            <p className="mt-3 text-[12.5px] leading-[1.6] text-ink-faint">
              Cards are flat: a 1px line and no shadow. Only popovers and drawers lift. A
              table row is never shadowed.
            </p>
            <div className="mt-4 flex gap-3">
              <div className="flex-1 rounded-[var(--radius-inner)] border border-line bg-surface p-3 text-[12px] text-ink-body">
                Flat card
              </div>
              <div className="flex-1 rounded-[var(--radius-inner)] border border-line bg-surface p-3 text-[12px] text-ink-body shadow-[var(--shadow-raised)]">
                Raised
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <Eyebrow>Type roles</Eyebrow>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <div className="font-display text-[22px] font-semibold tracking-[-0.03em]">
                  Space Grotesk
                </div>
                <div className="text-[12px] text-ink-faint">Titles, stats, headings</div>
              </div>
              <div>
                <div className="text-[14px]">IBM Plex Sans</div>
                <div className="text-[12px] text-ink-faint">Body prose and labels</div>
              </div>
              <div>
                <div className="machine text-[13px]">IBM Plex Mono</div>
                <div className="text-[12px] text-ink-faint">
                  Every machine-generated value, without exception
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </Section>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="machine text-[10.5px] tracking-[0.14em] text-ink-faint">{eyebrow}</div>
        <h3 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-6 shrink-0 rounded-[var(--radius-chip)] border border-line"
        style={{ background: hex }}
      />
      <span className="text-[12.5px] text-ink-body">{name}</span>
      <span className="machine ml-auto text-[11px] text-ink-disabled">{hex}</span>
    </div>
  );
}

function RadiusRow({ label, px }: { label: string; px: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-6 shrink-0 border border-line bg-sunk"
        style={{ borderRadius: px }}
      />
      <span>{label}</span>
      <span className="machine ml-auto text-[11px] text-ink-disabled">{px}px</span>
    </div>
  );
}
