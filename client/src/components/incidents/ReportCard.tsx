import { Panel, RedactedText } from "@/components/ui/primitives";

/**
 * The report as analysts see it: redacted, and only redacted.
 *
 * There is no toggle to the original text. The un-redacted report is still held
 * on the server for evidentiary purposes, but nothing in this interface can
 * surface it — the safest way to guarantee personal data is not read casually is
 * for the screen to have no control that reveals it.
 */
export function ReportCard({
  redactedReport,
  redactionNote,
}: {
  redactedReport: string;
  redactionNote: string;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line-subtle bg-sunk px-5 py-3">
        <span className="text-[12.5px] font-medium text-ink">Report</span>
        <span className="machine text-[10px] tracking-[0.1em] text-ink-faint">REDACTED</span>
      </div>

      <div className="machine px-5 py-[18px] text-[13px] leading-[1.8] whitespace-pre-wrap text-ink-body">
        <RedactedText text={redactedReport} />
      </div>

      <div className="border-t border-line-subtle px-5 py-3 text-[12px] text-ink-faint">
        {redactionNote}
      </div>
    </Panel>
  );
}
