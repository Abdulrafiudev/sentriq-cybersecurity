import {
  INCIDENT_CATEGORIES,
  type IncidentCategory,
  type ReportLanguage,
  type SecondOpinion,
} from "../types/domain";
import type { LlmAnalysis } from "./ai.service";

/**
 * Step 3 of the pipeline.
 *
 * The keyword classifier below is not a toy fallback — it is the control the PRD
 * asks for. It runs on every report, is compared against GPT's answer, and takes
 * over completely when no model is configured.
 *
 * It is a second *opinion*, not a second classifier. On unseen text the model
 * classifies better; what the rule engine adds is an independent cross-check, and
 * two methods disagreeing is a far better uncertainty signal than asking a model
 * how confident it feels. See `reconcileClassification` for how that is published.
 */

interface Rule {
  category: IncidentCategory;
  /** Weighted signals. Pidgin phrasings sit alongside their English equivalents. */
  signals: Array<[RegExp, number]>;
}

const RULES: Rule[] = [
  {
    category: "Phishing",
    signals: [
      [/\bphish/i, 4],
      [/\b(click(ed)?|tap(ped)?)\b[^.]{0,40}\b(link|url)\b/i, 3],
      [/\b(link|url)\b[^.]{0,40}\b(click(ed)?|open(ed)?)\b/i, 3],
      [/\baccount\b[^.]{0,30}\b(block|suspend|deactivat|expire)/i, 3],
      [/\b(verify|confirm|update)\b[^.]{0,30}\b(account|detail|password|bvn)/i, 2.5],
      [/\bfake\b[^.]{0,20}\b(site|page|portal|website)/i, 3],
      [/\b(clone|cloned|lookalike|spoofed)\b/i, 2.5],
      [/\bdem send me\b|\bmessage say\b|\bgo block\b|\bwey dey inside\b/i, 3],
      [/\b(otp|one[- ]time)\b/i, 1.5],
      [/\bsms\b|\btext message\b|\bgot a text\b/i, 1.5],
      [/\b(shortened|suspicious|strange|fake|unknown) link\b/i, 3],
    ],
  },
  {
    category: "Malware",
    signals: [
      [/\b(ransomware|ransom note|encrypt(ed|ing)?)\b/i, 4],
      [/\b(malware|virus|trojan|worm|spyware|keylogger)\b/i, 4],
      [/\bmacro[- ]enabled\b|\bmacro\b/i, 2.5],
      [/\battachment\b/i, 2],
      [/\.(exe|scr|js|vbs|docm|xlsm|lokx|locked)\b/i, 3],
      [/\bfiles?\b[^.]{0,30}\b(rename|end in|extension|cannot open)/i, 3],
      [/\bantivirus\b|\bendpoint\b[^.]{0,20}\balert/i, 2],
      [/\bcomputer\b[^.]{0,30}\b(slow|strange|pop[- ]?up)/i, 1.5],
      [/\b(mail )?gateway\b[^.]{0,30}\bblock(ed)?\b/i, 3],
      [/\b(file )?hash\b|\b[a-f0-9]{32,64}\b/i, 2],
      [/\binvoice\b[^.]{0,20}\battachment\b/i, 2],
    ],
  },
  {
    category: "Account Takeover",
    signals: [
      [/\b(someone|person|somebody)\b[^.]{0,40}\b(login|log in|logged in|enter(ed)? my account|access(ed)? my account)/i, 4],
      [/\bunrecogni[sz]ed\b[^.]{0,20}\b(login|device|session)/i, 3.5],
      [/\blogin (alert|from)\b/i, 2.5],
      [/\b(password|pin) (was )?changed\b/i, 3],
      [/\blocked out\b|\bcan(?:'|no)?t (log ?in|access) my (account|email)/i, 3],
      [/\bperson don enter my account\b|\bdon enter my\b|\bmy account don\b/i, 4],
      [/\b(money|funds|₦|ngn)\b[^.]{0,30}\b(gone|missing|transfer|waka|disappear)/i, 3],
      [/\bwaka\b/i, 2],
      [/\b(somebody|someone|person|dem)\b[^.]{0,30}\b(don )?dey use my\b/i, 4],
      [/\bdon dey use my\b/i, 4],
    ],
  },
  {
    category: "Credential Theft",
    signals: [
      [/\b(password|credential)s?\b[^.]{0,30}\b(stolen|leaked|shared|expos)/i, 4],
      [/\bkeylogger\b/i, 4],
      [/\bshoulder surf/i, 3],
      [/\bwrote (my |the )?password\b|\bshared (my |the )?password\b/i, 3],
      [/\bdump\b[^.]{0,20}\bcredential/i, 3],
      [/\b(password|credential)s?\b[^.]{0,40}\b(plain ?text|in the clear|visible to|spreadsheet|sticky note)/i, 4],
      [/\bservice account\b[^.]{0,40}\bpassword/i, 3.5],
    ],
  },
  {
    category: "Unauthorized Access",
    signals: [
      [/\b(contractor|vendor|intern|former (staff|employee)|ex[- ]staff)\b/i, 2.5],
      [/\b(outside|after) (working )?hours\b|\bat 0?[0-4]:\d{2}\b/i, 2.5],
      [/\baccess(ed)?\b[^.]{0,40}\b(record|database|file|folder|system)s?\b/i, 3],
      [/\bshould (only|not)\b[^.]{0,30}\b(reach|access|see)\b/i, 3.5],
      [/\bprivilege\b|\badmin (right|access)/i, 2.5],
      [/\bshared (drive|folder)\b[^.]{0,30}\bopen(ed)?\b/i, 2],
      [/\b(repeated|multiple|many) failed (login|sign[- ]?in|attempt)/i, 3.5],
      [/\bservice account\b/i, 2.5],
      [/\bstill (has|have) access\b|\baccount is still active\b/i, 3],
    ],
  },
  {
    category: "Data Breach",
    signals: [
      [/\b(data )?(breach|leak(ed|age)?|exfiltrat)/i, 4],
      [/\b(records?|database|dataset)\b[^.]{0,40}\b(publish|post|online|for sale|dark web|dump)/i, 4],
      [/\b(citizen|customer|patient|staff) (data|records?|details)\b[^.]{0,40}\b(expos|public|shar)/i, 3.5],
      [/\bsent to the wrong\b|\bwrong (recipient|group|chat|person|number|address)\b/i, 3],
      [/\b(email(ed)?|sent|shared)\b[^.]{0,40}\b(external|outside) (address|email|recipient|party)/i, 3.5],
      [/\bstaff list\b|\bcontact list\b|\bbeneficiary (database|list)\b/i, 2.5],
    ],
  },
  {
    category: "Fraud / Social Engineering",
    signals: [
      [/\b(invoice|payment|bank) (detail|account)s?\b[^.]{0,40}\bchang/i, 4],
      // Impersonation alone is weak — phishing impersonates too. It only counts
      // for fraud when no link or credential request is involved.
      [/\b(pretend|claim|impersonat)(ing|ed|s)?\b[^.]{0,30}\b(to be|as)\b/i, 1.5],
      [/\b(update|change|switch)\b[^.]{0,30}\b(bank|payment|invoice) (detail|account)/i, 4],
      [/\b(gift card|voucher|recharge card)\b[^.]{0,40}\b(code|send|buy)/i, 3],
      [/\bconfirm (my |your )?(bvn|nin|account number)\b/i, 3],
      [/\b(call(ed|er)?|phone[d]?|rang)\b[^.]{0,40}\b(said|claiming|say)\b/i, 2.5],
      [/\b(ceo|director|manager|oga)\b[^.]{0,40}\b(ask|request|urgent|transfer)/i, 3],
      [/\b(scam|fraud|419|yahoo boy)\b/i, 3],
      [/\bgift card|voucher\b/i, 2.5],
      [/\bbusiness email compromise|\bbec\b/i, 4],
      [/\bwhatsapp\b[^.]{0,40}\b(ask|request|pay|account)/i, 2],
    ],
  },
];

/** Signals that a report is routine noise and should not be dressed up as an attack. */
const BENIGN_SIGNALS: Array<[RegExp, number]> = [
  [/\b(forgot|reset) my password\b/i, 3],
  [/\bprinter\b|\bwifi (is )?(slow|down)\b|\bnetwork (is )?slow\b/i, 3],
  [/\bfalse alarm\b|\bit was legitimate\b|\bturned out fine\b|\bnothing happened\b/i, 3],
  [/\bhow do i\b|\bcan someone help me\b/i, 1.5],
];

const PIDGIN_MARKERS = [
  /\bdem\b/i, /\bwey\b/i, /\bna\b/i, /\babeg\b/i, /\bmake i\b/i, /\bno be\b/i,
  /\bdon\b/i, /\bgo block\b/i, /\bwaka\b/i, /\bsabi\b/i, /\boga\b/i, /\bwahala\b/i,
  /\bcall am\b/i, /\bgive am\b/i, /\bi no\b/i, /\bdey\b/i, /\byansh\b/i, /\bsef\b/i,
];

export interface HeuristicClassification {
  category: IncidentCategory;
  confidence: number;
  explanation: string;
  /** Per-category score, useful for debugging and the evaluation report. */
  scores: Record<string, number>;
}

export function classifyWithRules(report: string): HeuristicClassification {
  const scores: Record<string, number> = {};
  const matched: Record<string, string[]> = {};

  for (const rule of RULES) {
    let score = 0;
    const hits: string[] = [];
    for (const [pattern, weight] of rule.signals) {
      const found = report.match(pattern);
      if (found) {
        score += weight;
        hits.push(found[0].trim().toLowerCase());
      }
    }
    scores[rule.category] = Number(score.toFixed(2));
    matched[rule.category] = hits;
  }

  let benign = 0;
  for (const [pattern, weight] of BENIGN_SIGNALS) if (pattern.test(report)) benign += weight;

  const ranked = [...RULES]
    .map((r) => ({ category: r.category, score: scores[r.category] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const runnerUp = ranked[1];

  if (!best || best.score < 2.5 || benign >= best.score) {
    return {
      category: "Other",
      confidence: 0.42,
      explanation:
        "No category scored high enough on the rule set. The report reads as routine or too vague to classify, so it is queued for human review rather than forced into a category.",
      scores,
    };
  }

  // Confidence grows with absolute score and with the margin over the runner-up.
  const margin = best.score - (runnerUp?.score ?? 0);
  const raw = 0.5 + Math.min(0.28, best.score / 28) + Math.min(0.2, margin / 14);
  const confidence = Number(Math.min(0.94, raw).toFixed(2));

  const hits = (matched[best.category] ?? []).slice(0, 3);
  const explanation = hits.length
    ? `Rule-based classifier matched ${hits.length} ${best.category} signal${hits.length === 1 ? "" : "s"} in the report (${hits.map((h) => `"${h}"`).join(", ")}), scoring ${best.score} against ${runnerUp?.category ?? "no"} at ${runnerUp?.score ?? 0}.`
    : `Rule-based classifier scored ${best.category} highest at ${best.score}.`;

  return { category: best.category, confidence, explanation, scores };
}

export function detectLanguage(report: string): ReportLanguage {
  const hits = PIDGIN_MARKERS.reduce((n, p) => n + (p.test(report) ? 1 : 0), 0);
  const words = report.trim().split(/\s+/).length;
  if (hits === 0) return "English";
  const density = hits / Math.max(1, words / 12);
  if (density >= 1 || hits >= 4) return "Nigerian Pidgin";
  if (hits >= 2) return "Mixed";
  return "English";
}

/**
 * Analyst headline used when GPT is unavailable.
 *
 * Must be given the REDACTED report. Titles are shown in the queue, on the
 * dashboard and in related-incident cards, so building one from the original
 * text would push personal data straight back onto every screen.
 */
export function buildFallbackTitle(redactedReport: string, category: IncidentCategory): string {
  const firstSentence =
    redactedReport.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0] ?? redactedReport;

  if (firstSentence.length <= 76) {
    return firstSentence.length >= 12 ? firstSentence : `${category} report requiring review`;
  }

  // Cut on a word boundary — a title sliced mid-word reads like a bug.
  const cut = firstSentence.slice(0, 73);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
  return trimmed;
}

/**
 * Replaces any PII the redactor found with its token, in case the model echoed a
 * personal name or an internal system name back in the title it wrote.
 */
export function scrubTitle(title: string, entities: Array<{ original: string; token: string }>) {
  let scrubbed = title;
  for (const entity of entities) {
    if (entity.original.length < 2) continue;
    scrubbed = scrubbed.split(entity.original).join(entity.token);
  }
  return scrubbed;
}

export interface ClassificationDecision {
  category: IncidentCategory;
  confidence: number;
  explanation: string;
  /** What the rule engine independently concluded. Null when it was the only classifier. */
  secondOpinion: SecondOpinion | null;
}

/**
 * Combines the model's answer with the rule classifier's.
 *
 * The rule engine is a second *opinion*, not a second classifier: on unseen text
 * the model is the better classifier, and the keyword engine's "confidence" is a
 * score derived from keyword weights, not a probability. Blending the two made the
 * published number mean less rather than more, and it penalised correct answers —
 * a report describing a phishing message that led to a takeover would have the
 * model's correct "Account Takeover" marked down because the keyword engine
 * matched on "clicked a link".
 *
 * So the model's category and its own confidence are published untouched, and
 * disagreement is surfaced as a flag the analyst can see. Same warning, without
 * corrupting the score.
 */
export function reconcileClassification(
  llm: LlmAnalysis | null,
  rules: HeuristicClassification,
): ClassificationDecision {
  // No model configured: the rule engine is the classifier, so its score stands.
  if (!llm || !INCIDENT_CATEGORIES.includes(llm.category)) {
    return {
      category: rules.category,
      confidence: rules.confidence,
      explanation: rules.explanation,
      secondOpinion: null,
    };
  }

  return {
    category: llm.category,
    confidence: Number(llm.categoryConfidence.toFixed(2)),
    explanation: llm.categoryExplanation,
    secondOpinion: {
      category: rules.category,
      agreed: llm.category === rules.category,
    },
  };
}
