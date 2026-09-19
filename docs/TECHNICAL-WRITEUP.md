# Sentriq — Technical Write-up

**Track D — Government, Public Sector & National Data: Sorting Incident Reports Nobody Has Time to Read**

---

## 1. The problem, stated precisely

A national SOC receives far more incident reports than it can read. The reports are written by people who are not security analysts — staff, contractors, members of the public — in whatever words they have, in English or Nigerian Pidgin. Each one needs the same six judgements before anyone can act:

1. What happened?
2. What technical evidence is in here?
3. How serious is it?
4. Have we seen this already?
5. Who should handle it?
6. Does it contain personal data we should not be circulating?

Done by hand, that is roughly four minutes per report before triage even begins, and it is done inconsistently: two analysts reading the same report routinely disagree about severity. The failure mode that matters is not slowness — it is a confirmed compromise sitting in a queue behind forty password-reset requests.

Sentriq makes those six judgements automatically and presents the result as a structured incident. It does not replace the analyst. It decides what the analyst should look at first.

---

## 2. What was built

A monorepo with two clearly separated applications.

**`server/`** — Node, Express, TypeScript, MongoDB, Mongoose, OpenAI. MVC, with all decision logic in a service layer. The server owns the entire pipeline.

**`client/`** — Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, TanStack Query. Four analyst screens (triage overview, incident queue, incident detail, submit report) plus evaluation, routing rules, and a living design-system sheet. The client renders; it never decides.

Where the code runs when a report is submitted:

![Request lifecycle: analyst submits a report, the Express API validates it, the triage pipeline runs seven stages and calls GPT once, the redacted incident is stored in MongoDB, and it surfaces on the dashboard and queue.](diagrams/01-request-lifecycle.svg)

The pipeline itself is seven ordered stages:

![The seven pipeline stages in order: received, redaction, classification, indicator extraction, severity scoring, related incidents, routing.](diagrams/02-pipeline-stages.svg)

Every stage is timed, and those timings are returned to the submit screen so its progress stepper shows the real run rather than an animation.

---

## 3. The central design decision: rules and the model both run, always

The obvious build is "send the report to an LLM, store what comes back". We did not do that, for three reasons.

**Predictable data does not need a model.** An IP address, a URL, a hash, a Nigerian phone number and a 10-digit NUBAN account number all have fixed shapes. A regex finds them every time, at zero cost and zero latency, and cannot hallucinate one that is not there. Handing those to a model trades reliability for nothing.

**A model with no control cannot be audited.** If GPT is the only classifier, "why is this Critical?" has no answer beyond the model's own prose.

**The system must work when the model does not.** No key, no network, rate limit, outage — the queue still has to move.

So the rule engine runs on **every** report, even when GPT is available, and the two are reconciled:

![Both engines run, their answers are reconciled, and the stored incident reflects the result: disagreement lowers confidence, and the model may raise severity but not bury it.](diagrams/03-rules-gpt-reconciliation.svg)

| Stage | Rules contribute | GPT contributes |
|---|---|---|
| Redaction | phone, email, account, national ID, money | personal names, internal system names, addresses |
| Classification | weighted keyword engine, 8 categories, English + Pidgin | contextual classification |
| Indicators | URL, domain, IP, hash, email | affected systems, named accounts |
| Severity | 11 impact factors, 4 mitigations, category baselines | reasoning over context |
| Routing | ordered policy rules | **nothing — routing is policy, not inference** |

Reconciliation is where the interesting behaviour lives:

- **Classification disagreement is surfaced, not scored.** The rule engine is a second *opinion*, not a second classifier: on unseen text the model classifies better, and the keyword engine's "confidence" is a weighted score rather than a probability. An earlier version blended the two and cut confidence on disagreement. That was wrong in a specific, observable way — a report describing a phishing message that led to an account takeover had the model's correct answer marked down to 64% because the keyword engine matched on "clicked a link". Enough of those and analysts stop trusting the number, which defeats the purpose. The model's category and confidence are now published untouched, and disagreement appears as a flag on the incident and in the queue. Same warning, no distortion.

- **Severity is asymmetric.** GPT may escalate freely. It may de-escalate by at most **one level** from the rule score. Under-calling a real compromise costs far more than over-calling a benign one, so the model is trusted to raise an alarm but not to bury one.

- **Rules outrank the model on extraction.** A regex-matched indicator can never be removed by GPT. An indicator the model reports is only accepted if the value actually appears in the text — which blocks the most common hallucination in this task, a plausible-looking domain that was never in the report.

---

## 4. Privacy is the first stage, not a filter at the end

Redaction runs *before* classification, embedding, storage, or anything else. Every later stage — and the entire dashboard — only ever sees redacted text.

Three decisions worth defending:

**Technical indicators are deliberately not redacted.** URLs, IPs, domains and hashes are indicators of compromise, not personal data. An analyst cannot add `[URL]` to a blocklist. They stay visible; `REDACT_TECHNICAL=true` flips this for deployments with a stricter policy.

**Titles are built from redacted text and scrubbed again.** A title appears on the dashboard, in the queue, and inside every related-incident card. Generating it from the original report would quietly push personal data onto more screens than the report itself ever reaches. Titles are derived from the redacted text and then re-scrubbed against every entity the redactor found — including anything the model echoed back.

**The interface cannot show the original report at all.** `originalReport` is stripped from every ordinary API payload, and no screen offers a way to reveal it. An earlier build had a role-gated tab that fetched it and logged the reveal; that was removed, because the strongest guarantee that personal data is not read casually is a screen with no control that reveals it. The un-redacted text is still stored for evidentiary purposes, and `GET /api/incidents/:id/original` still exists behind the `lead` role and still writes an audit line — but it is now a deliberate, out-of-band action rather than a button.

---

## 5. Related-incident detection

Reports are embedded and compared by cosine similarity. Two backends sit behind one function:

- **MongoDB Atlas Vector Search** (`$vectorSearch`) — the production path, an index on `embedding`.
- **In-process cosine** over recent incidents — correct, just O(n). The default, so a local Mongo works with no extra setup. Atlas failures fall back to it rather than failing the request.

The embedding itself is `text-embedding-3-small` when a key is present, and a deterministic hashed bag-of-words vector otherwise. The fallback is not a placeholder — near-duplicate detection is largely a lexical problem, and it works: **100% duplicate recall on the labelled set with no API key at all.**

One non-obvious detail. Semantic and lexical vectors live on different scales: unrelated documents sit around 0.3–0.4 in OpenAI's space but near 0.05 in the lexical one. A single global threshold would be wrong for both, so thresholds are chosen per vector space. Getting this wrong was, in fact, a real bug during development — duplicate recall was 0% until the thresholds were separated.

---

## 6. Evaluation — including what does not work

A prototype that is demonstrated is not the same as a prototype that is tested. `pnpm evaluate` replays a labelled synthetic dataset through the live pipeline, measures five things, and **stores every failure** — which the client then renders at `/evaluation`.

The dataset is 32 reports covering all eight categories, both languages, benign noise, true duplicates, and "similar but unrelated" pairs built specifically to fool a naive similarity check. Every value in it is invented: reserved phone-number ranges, non-routable domains, fictional names. No real personal data.

Results with the **rules-only engine** (no API key) — the floor, not the ceiling:

| Metric | Result |
|---|---|
| Classification accuracy | 90.6% (29/32) |
| Severity accuracy, exact | 62.5% (20/32) — 96.9% within one level |
| Indicator extraction, recall | 76% (19/25) |
| PII detection, recall | 58.8% (10/17) |
| Duplicate detection, recall | 100% (3/3), 5 false positives |

What these numbers actually say:

**PII recall is the weakest metric, and it is the clearest argument for the hybrid design.** Every miss is a personal name ("Amina") or an internal system name ("Treasury Portal", "Records API") — categories with no fixed shape that regex cannot reach by construction. This is precisely the gap GPT fills, and it is the metric that moves most when a key is configured.

**Severity exact-match looks poor and mostly is not.** The scale is four wide and the labels are strict; 96.9% land within one level. The failures that matter are the ones off by more than one, and the harness flags those separately.

**Duplicate false positives are a deliberate trade.** The threshold is tuned for recall, because a missed duplicate means an analyst reads the same campaign twice, while a false positive is one click to dismiss.

**Three classification failures are kept and named**, because each is instructive:

- *A vishing report* — a caller asking for a BVN — is classified Phishing rather than Fraud. The rule engine sees "confirm your account before it is blocked" and lands on the wrong vector. A phone call is not a phishing email, and the distinction changes who responds.
- *A legitimate password-expiry notice* is flagged as Phishing. It is worded almost identically to the real attack. This is the false-positive class that erodes analyst trust fastest.
- *A keylogger on a shared machine* is classified Malware rather than Credential Theft. Defensible, arguably both, and exactly the kind of case where a confidence score matters more than a label.

---

## 7. What is deliberately not built

Per the brief: no SIEM or SOC integrations, no paid threat feeds, no complex RBAC, no mobile app, no distributed infrastructure.

Authentication is intentionally minimal — one seeded admin, JWT, protected routes, and exactly two roles, where the second exists only to gate the un-redacted report. The JWT sits in a readable cookie so the Next.js edge can gate navigation without a server session; that is a scope simplification and is documented as one. The cookie is never trusted for authorisation — the API verifies the signature on every request.

---

## 8. Honest limitations

- Similarity is O(n) unless Atlas Vector Search is enabled. Fine at this scale, not at millions of incidents.
- `POST /api/incidents` is a single round trip, so the submit screen's stepper advances optimistically while waiting. Stage notes stay blank until the server's real timings arrive — the UI never displays a result it has not been told — but true streamed progress needs SSE.
- Pidgin coverage in the rule engine is hand-built from the dataset's phrasings and generalises less well than the model does. Pidgin is not a dialect with a fixed orthography, and a keyword engine feels that acutely.
- The evaluation set is 32 reports. Large enough to expose failure classes, too small for confidence intervals worth quoting.
- Routing rules are code, not configuration. Visible and auditable at `/routing-rules`, but changing one needs a deploy.

---

## 9. Why this addresses Track D

The track asks for a system that classifies, prioritises, cleans, routes and groups duplicate reports. Sentriq does all five, and adds the one the brief implies but does not name: it removes personal data before anything else happens, because a government incident queue is exactly the place where personal data should not accumulate.

The measure that matters is not accuracy in isolation. It is whether an analyst opening the dashboard sees the seven incidents that need them today, instead of 1,284 that might.
