"use client";

import { useState } from "react";
import { useSubmitReport } from "@/hooks/useIncidents";
import { toApiError } from "@/services/apiClient";
import type { LanguageHint } from "@/types/incident";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { motion } from "framer-motion";

export default function PublicReportPage() {
  const [draft, setDraft] = useState("");
  const [language] = useState<LanguageHint>("Auto-detect");
  const [isSuccess, setIsSuccess] = useState(false);

  const submit = useSubmitReport({
    onSuccess: () => {
      setIsSuccess(true);
    },
  });

  const run = () => {
    submit.mutate({ report: draft, languageHint: language });
  };

  const reset = () => {
    setDraft("");
    setIsSuccess(false);
    submit.reset();
  };

  return (
    <div className="min-h-screen bg-bg selection:bg-ink selection:text-surface flex flex-col items-center py-12 px-5 sm:px-8">
      <div className="w-full max-w-[900px] mb-12 flex items-center justify-between gap-3">
        <div className="flex items-center gap-[10px]">
          <span className="grid size-[26px] place-items-center rounded-lg bg-[linear-gradient(140deg,#13A272,#0A6B4C)]">
            <span className="size-2 rounded-[2px] bg-[#EAFBF3]" />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">
            Sentriq
          </span>
        </div>
      </div>

      {isSuccess ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-[620px] flex flex-col items-center text-center gap-6 mt-12 bg-surface border border-line rounded-[var(--radius-flow)] p-12"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 size={32} className="stroke-[1.5]" />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">
              Report Submitted Securely
            </h2>
            <p className="text-[15px] leading-[1.6] text-ink-muted">
              Thank you for your submission. Our security analysts have received your report.
            </p>
          </div>
          <Button onClick={reset} className="mt-4 px-6 py-2.5">
            Submit another report
          </Button>
        </motion.div>
      ) : (
        <div className="w-full max-w-[900px] flex flex-col gap-[22px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 w-full items-start">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-[36px] font-semibold tracking-[-0.03em] text-ink">
                  Did someone try to scam or hack you?
                </h1>
                <p className="text-[16px] leading-[1.6] text-pretty text-ink-muted">
                  Don&apos;t worry. Just tell us what happened in your own words below. You can write it exactly as it happened — even in Pidgin. We are here to help you, and we will make sure your information is kept safe.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-[var(--radius-flow)] border border-line bg-surface focus-within:border-jade-500 focus-within:ring-1 focus-within:ring-jade-500 transition-all shadow-sm">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={10}
                    placeholder="Type your report here..."
                    className="block w-full resize-y border-0 bg-transparent p-5 text-[15px] leading-[1.7] text-ink outline-none placeholder:text-ink-disabled"
                  />
                </div>
                
                <div className="flex justify-start">
                  <Button
                    onClick={run}
                    disabled={submit.isPending || draft.trim().length < 10}
                    className="px-8 py-3 text-[15px] rounded-full shadow-sm w-full sm:w-auto"
                  >
                    {submit.isPending ? "Sending..." : "Send your report"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 rounded-[var(--radius-flow)] border border-line bg-surface p-6 shadow-sm">
              <h3 className="font-display text-[17px] font-semibold text-ink">
                What to include
              </h3>
              <ul className="flex flex-col gap-3 text-[14px] text-ink-muted leading-[1.5]">
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-jade-500" />
                  <span>The <strong>phone number</strong> or <strong>email address</strong> they used to contact you.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-jade-500" />
                  <span>Any <strong>links</strong> or websites they asked you to click.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-jade-500" />
                  <span>What <strong>information you gave them</strong> (e.g., password, bank details, OTP code).</span>
                </li>
              </ul>
              
              <div className="mt-2 flex flex-col gap-3 border-t border-line-subtle pt-5">
                <h3 className="font-display text-[14px] font-semibold text-ink">
                  Need an example?
                </h3>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft("I received an email saying my account for Treasury Portal would be blocked. The sender was alerts@secure-verifyy.com and I clicked https://secure-verify-accounts.xyz/login and entered my password. Later 08012345678 called asking for the OTP.")}
                    className="text-left text-[13px] text-ink-muted hover:text-jade-600 transition-colors py-1.5 px-3 rounded-md hover:bg-jade-50 border border-transparent hover:border-jade-100"
                  >
                    See English example
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft("Dem send me message say my account go block. I click the link wey dey inside and enter my password. Person from 08012345678 call me say I should give am the code.")}
                    className="text-left text-[13px] text-ink-muted hover:text-jade-600 transition-colors py-1.5 px-3 rounded-md hover:bg-jade-50 border border-transparent hover:border-jade-100"
                  >
                    See Pidgin example
                  </button>
                </div>
              </div>
            </div>
          </div>

          {submit.isError ? (
            <div className="rounded-[var(--radius-inner)] border border-critical-border bg-critical-bg px-4 py-3 text-[13px] text-critical">
              {toApiError(submit.error).message}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
