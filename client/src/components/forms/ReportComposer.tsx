"use client";

import { Button, SegmentedOption } from "@/components/ui/primitives";
import { LANGUAGE_HINTS, type LanguageHint } from "@/types/incident";

export const SAMPLE_EN =
  "I received an email saying my account for Treasury Portal would be blocked. The sender was alerts@secure-verifyy.com and I clicked https://secure-verify-accounts.xyz/login and entered my password. Later 08012345678 called asking for the OTP.";

export const SAMPLE_PIDGIN =
  "Dem send me message say my account go block. I click the link wey dey inside and enter my password. Person from 08012345678 call me say I should give am the code.";

/**
 * Intake. No schema, no required fields — the whole premise is that people report
 * incidents in whatever words they have, and Sentriq does the structuring.
 */
export function ReportComposer({
  draft,
  onDraftChange,
  language,
  onLanguageChange,
  onRun,
  running,
  completed,
  disabled,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  language: LanguageHint;
  onLanguageChange: (value: LanguageHint) => void;
  onRun: () => void;
  running: boolean;
  completed: boolean;
  disabled?: boolean;
}) {
  const characters = draft.trim().length;

  const applySample = (sample: string, hint: LanguageHint) => {
    onDraftChange(sample);
    onLanguageChange(hint);
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-flow)] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle bg-sunk px-4 py-3">
        <div className="flex flex-wrap gap-[6px]">
          {LANGUAGE_HINTS.map((option) => (
            <SegmentedOption
              key={option}
              active={language === option}
              onClick={() => onLanguageChange(option)}
            >
              {option}
            </SegmentedOption>
          ))}
        </div>

        <div className="flex gap-[6px]">
          <button
            type="button"
            onClick={() => applySample(SAMPLE_EN, "English")}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-line bg-surface px-[11px] py-[6px] text-[12px] text-ink-muted hover:text-ink"
          >
            English sample
          </button>
          <button
            type="button"
            onClick={() => applySample(SAMPLE_PIDGIN, "Nigerian Pidgin")}
            className="cursor-pointer rounded-[var(--radius-pill)] border border-line bg-surface px-[11px] py-[6px] text-[12px] text-ink-muted hover:text-ink"
          >
            Pidgin sample
          </button>
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        rows={8}
        aria-label="Incident report"
        placeholder="e.g. Dem send me message say my account go block…"
        className="machine block w-full resize-y border-0 bg-surface p-5 text-[13.5px] leading-[1.8] text-ink outline-none placeholder:text-ink-disabled"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-[14px]">
        <span className="machine text-[11px] text-ink-disabled">
          {characters} characters · no schema required
        </span>
        <Button
          onClick={onRun}
          disabled={disabled || running || characters < 12}
          className="px-5 py-[11px] text-[14px] rounded-[10px]"
        >
          {running ? "Processing…" : completed ? "Run triage again" : "Run triage pipeline"}
        </Button>
      </div>
    </div>
  );
}
