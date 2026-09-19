import type { IncidentCategory, ReportLanguage, Severity } from "../types/domain";

/**
 * Synthetic evaluation dataset (PRD §15).
 *
 * Every value here is invented. No real person, account, phone number, email or
 * organisation appears — phone numbers use the reserved 0801234xxxx range,
 * domains are non-routable inventions, and all names are fictional.
 *
 * Coverage: the eight categories, both languages, benign noise, near-duplicates,
 * and "similar but unrelated" pairs that a naive similarity check would merge.
 */

export interface DatasetRecord {
  id: string;
  report: string;
  language: ReportLanguage;
  expectedCategory: IncidentCategory;
  expectedSeverity: Severity;
  /** Verbatim substrings that must not survive redaction. */
  expectedPii: string[];
  /** Indicators the pipeline is expected to surface. */
  expectedIndicators: Array<{ type: string; value: string }>;
  /** Set when this record is a genuine duplicate of an earlier one. */
  duplicateOf?: string;
  /** Present when the record exists to test a specific failure mode. */
  note?: string;
}

export const DATASET: DatasetRecord[] = [
  // --- Phishing ------------------------------------------------------------
  {
    id: "SYN-001",
    report:
      "I received an email saying my account for Treasury Portal would be blocked. The sender was alerts@secure-verifyy.com and I clicked https://secure-verify-accounts.xyz/login and entered my password. Later 08012345678 called asking for the OTP.",
    language: "English",
    expectedCategory: "Phishing",
    expectedSeverity: "Critical",
    expectedPii: ["alerts@secure-verifyy.com", "08012345678", "Treasury Portal"],
    expectedIndicators: [
      { type: "URL", value: "https://secure-verify-accounts.xyz/login" },
      { type: "DOMAIN", value: "secure-verify-accounts.xyz" },
      { type: "EMAIL", value: "alerts@secure-verifyy.com" },
      { type: "SYSTEM", value: "Treasury Portal" },
    ],
  },
  {
    id: "SYN-002",
    report:
      "Dem send me message say my account go block. I click the link wey dey inside, na https://verify-acct-ng.top/secure, and I enter my password. Person from 08012345690 call me say make I give am the code.",
    language: "Nigerian Pidgin",
    expectedCategory: "Phishing",
    expectedSeverity: "Critical",
    expectedPii: ["08012345690"],
    expectedIndicators: [
      { type: "URL", value: "https://verify-acct-ng.top/secure" },
      { type: "DOMAIN", value: "verify-acct-ng.top" },
    ],
    note: "Pidgin equivalent of SYN-001. Same attack pattern, different language.",
  },
  {
    id: "SYN-003",
    report:
      "A branch officer reported the same cloned bank portal. The email said the Treasury Portal account would be blocked and pointed to https://secure-verify-accounts.xyz/login. She entered her password before realising it was fake.",
    language: "English",
    expectedCategory: "Phishing",
    expectedSeverity: "Critical",
    expectedPii: ["Treasury Portal"],
    expectedIndicators: [
      { type: "URL", value: "https://secure-verify-accounts.xyz/login" },
      { type: "DOMAIN", value: "secure-verify-accounts.xyz" },
    ],
    duplicateOf: "SYN-001",
    note: "Near-duplicate of SYN-001 — same campaign, different reporter.",
  },
  {
    id: "SYN-004",
    report:
      "I got a text pretending to be from the payments team with a shortened link. I did not click it and I deleted the message. Reporting it so others know.",
    language: "English",
    expectedCategory: "Phishing",
    expectedSeverity: "Low",
    expectedPii: [],
    expectedIndicators: [],
    note: "Phishing attempt with no interaction — must stay Low, not inflate to High.",
  },
  {
    id: "SYN-005",
    report:
      "An email claiming to be from IT asked everyone in the finance department to confirm their login details on a page hosted at hr-selfservice-portal.online. Three colleagues say they filled it in before the mail was recalled.",
    language: "English",
    expectedCategory: "Phishing",
    expectedSeverity: "Critical",
    expectedPii: [],
    expectedIndicators: [{ type: "DOMAIN", value: "hr-selfservice-portal.online" }],
  },

  // --- Malware -------------------------------------------------------------
  {
    id: "SYN-006",
    report:
      "Files on Shared Drive D now end in .lokx and there is a note asking for payment in crypto. It started after Amina opened an invoice attachment this morning. Hash of the attachment is 3f7ac9e1b2d84c05aa71e9f6c3d2b8a4.",
    language: "English",
    expectedCategory: "Malware",
    expectedSeverity: "Critical",
    expectedPii: ["Amina", "Shared Drive D"],
    expectedIndicators: [
      { type: "HASH", value: "3f7ac9e1b2d84c05aa71e9f6c3d2b8a4" },
      { type: "SYSTEM", value: "Shared Drive D" },
    ],
  },
  {
    id: "SYN-007",
    report:
      "Mail gateway blocked an invoice attachment sent to procurement@agency.example.ng. The file hash was 3f7ac9e1b2d84c05aa71e9f6c3d2b8a4. No user opened it.",
    language: "English",
    expectedCategory: "Malware",
    expectedSeverity: "Low",
    expectedPii: ["procurement@agency.example.ng"],
    expectedIndicators: [
      { type: "HASH", value: "3f7ac9e1b2d84c05aa71e9f6c3d2b8a4" },
      { type: "EMAIL", value: "procurement@agency.example.ng" },
    ],
    note: "Same campaign as SYN-006 but blocked upstream — severity must drop to Low.",
  },
  {
    id: "SYN-008",
    report:
      "My laptop keeps showing pop-ups and it became very slow after I installed a free PDF converter I found online. Antivirus flagged something but I closed the window.",
    language: "English",
    expectedCategory: "Malware",
    expectedSeverity: "Medium",
    expectedPii: [],
    expectedIndicators: [],
  },
  {
    id: "SYN-009",
    report:
      "My system don begin behave anyhow since I open one attachment wey come inside mail. The file na invoice.docm and now antivirus dey shout every minute.",
    language: "Nigerian Pidgin",
    expectedCategory: "Malware",
    expectedSeverity: "High",
    expectedPii: [],
    expectedIndicators: [],
  },

  // --- Account takeover ----------------------------------------------------
  {
    id: "SYN-010",
    report:
      "Person don enter my account. I see login from 102.89.44.7 and ₦120,000 just waka. I no give anybody my code.",
    language: "Nigerian Pidgin",
    expectedCategory: "Account Takeover",
    expectedSeverity: "Critical",
    expectedPii: ["₦120,000"],
    expectedIndicators: [{ type: "IP", value: "102.89.44.7" }],
  },
  {
    id: "SYN-011",
    report:
      "I received a login alert from a device I do not recognise in another state, and my email password was changed without me doing it. I can no longer log in to my mailbox.",
    language: "English",
    expectedCategory: "Account Takeover",
    expectedSeverity: "High",
    expectedPii: [],
    expectedIndicators: [],
  },
  {
    id: "SYN-012",
    report:
      "Somebody don dey use my staff account send message to my colleagues. I don change password already and IT don disable the session.",
    language: "Nigerian Pidgin",
    expectedCategory: "Account Takeover",
    expectedSeverity: "Medium",
    expectedPii: [],
    expectedIndicators: [],
    note: "Contained takeover — the containment language should hold severity down.",
  },

  // --- Credential theft ----------------------------------------------------
  {
    id: "SYN-013",
    report:
      "A shared spreadsheet on the departmental drive contained the service account passwords for the reporting tool in plain text. It has been open to the whole directory for months.",
    language: "English",
    expectedCategory: "Credential Theft",
    expectedSeverity: "High",
    expectedPii: [],
    expectedIndicators: [{ type: "SYSTEM", value: "reporting tool" }],
  },
  {
    id: "SYN-014",
    report:
      "I think a keylogger was installed on the shared front-desk computer. Someone found a small USB device behind it and several staff have logged into the payroll system from that machine.",
    language: "English",
    expectedCategory: "Credential Theft",
    expectedSeverity: "Critical",
    expectedPii: [],
    expectedIndicators: [{ type: "SYSTEM", value: "payroll system" }],
  },

  // --- Unauthorized access -------------------------------------------------
  {
    id: "SYN-015",
    report:
      "A contractor account opened citizen records at 02:00 from 41.58.120.33. The account should only reach the reporting tool, never the records database.",
    language: "English",
    expectedCategory: "Unauthorized Access",
    expectedSeverity: "High",
    expectedPii: [],
    expectedIndicators: [{ type: "IP", value: "41.58.120.33" }],
  },
  {
    id: "SYN-016",
    report:
      "A former employee still has access to the shared project folder three weeks after leaving. There is no sign that anything was opened, but the account is still active.",
    language: "English",
    expectedCategory: "Unauthorized Access",
    expectedSeverity: "Medium",
    expectedPii: [],
    expectedIndicators: [],
  },
  {
    id: "SYN-017",
    report:
      "Our monitoring showed repeated failed logins to the Records API from 41.58.120.33 overnight, then one successful login using a service account. We are still checking what was queried.",
    language: "English",
    expectedCategory: "Unauthorized Access",
    expectedSeverity: "Critical",
    expectedPii: ["Records API"],
    expectedIndicators: [
      { type: "IP", value: "41.58.120.33" },
      { type: "SYSTEM", value: "Records API" },
    ],
    note: "Shares an IP with SYN-015 but is a different incident — should relate, not merge.",
  },

  // --- Data breach ---------------------------------------------------------
  {
    id: "SYN-018",
    report:
      "A spreadsheet containing about 4,000 citizen records with names and phone numbers was emailed to an external address by mistake. The recipient has not replied.",
    language: "English",
    expectedCategory: "Data Breach",
    expectedSeverity: "Critical",
    expectedPii: [],
    expectedIndicators: [],
  },
  {
    id: "SYN-019",
    report:
      "Someone posted a sample of our beneficiary database on a forum and is offering the full dataset for sale. The sample columns match our live schema.",
    language: "English",
    expectedCategory: "Data Breach",
    expectedSeverity: "Critical",
    expectedPii: [],
    expectedIndicators: [],
  },
  {
    id: "SYN-020",
    report:
      "One report wey contain staff list waka go wrong group chat. Na only internal phone numbers dey inside, and we don delete am from the group.",
    language: "Nigerian Pidgin",
    expectedCategory: "Data Breach",
    expectedSeverity: "Medium",
    expectedPii: [],
    expectedIndicators: [],
  },

  // --- Fraud / social engineering -----------------------------------------
  {
    id: "SYN-021",
    report:
      "Someone claiming to be our vendor asked us to change the payment account to 0123456789 over WhatsApp. Finance has not made the payment yet.",
    language: "English",
    expectedCategory: "Fraud / Social Engineering",
    expectedSeverity: "Medium",
    expectedPii: ["0123456789"],
    expectedIndicators: [],
  },
  {
    id: "SYN-022",
    report:
      "A caller said he was from the director's office and asked me to buy gift cards urgently and send the codes. I did not do it but he called three times from 08012345699.",
    language: "English",
    expectedCategory: "Fraud / Social Engineering",
    expectedSeverity: "Medium",
    expectedPii: ["08012345699"],
    expectedIndicators: [],
  },
  {
    id: "SYN-023",
    report:
      "One man call me say na from bank, say make I confirm my BVN 12345678901 before dem block my account. I no gree give am but e still dey call.",
    language: "Nigerian Pidgin",
    expectedCategory: "Fraud / Social Engineering",
    expectedSeverity: "Medium",
    expectedPii: ["12345678901"],
    expectedIndicators: [],
    note: "Vishing rather than phishing — a URL-focused classifier will get this wrong.",
  },
  {
    id: "SYN-024",
    report:
      "Our vendor emailed asking to update their bank details before the next invoice run. The email came from accounts@vendor-billing-update.site, which is not their usual domain, and finance already sent ₦2,400,000.",
    language: "English",
    expectedCategory: "Fraud / Social Engineering",
    expectedSeverity: "Critical",
    expectedPii: ["accounts@vendor-billing-update.site", "₦2,400,000"],
    expectedIndicators: [
      { type: "EMAIL", value: "accounts@vendor-billing-update.site" },
      { type: "DOMAIN", value: "vendor-billing-update.site" },
    ],
  },

  // --- Benign / noise ------------------------------------------------------
  {
    id: "SYN-025",
    report:
      "I forgot my password and the reset link is not arriving in my inbox. Can someone from IT help me get back in?",
    language: "English",
    expectedCategory: "Other",
    expectedSeverity: "Low",
    expectedPii: [],
    expectedIndicators: [],
    note: "Benign service request. Must not be dressed up as an incident.",
  },
  {
    id: "SYN-026",
    report:
      "The office wifi is very slow today and the printer on the second floor keeps going offline. Nothing suspicious, just reporting it.",
    language: "English",
    expectedCategory: "Other",
    expectedSeverity: "Low",
    expectedPii: [],
    expectedIndicators: [],
  },
  {
    id: "SYN-027",
    report:
      "I reported a strange email yesterday but it turned out to be legitimate — it was from our new insurance provider. False alarm, please close it.",
    language: "English",
    expectedCategory: "Other",
    expectedSeverity: "Low",
    expectedPii: [],
    expectedIndicators: [],
  },
  {
    id: "SYN-028",
    report:
      "Abeg, how I go take change my email password? I no sabi where the setting dey. Nothing happen, I just wan change am.",
    language: "Nigerian Pidgin",
    expectedCategory: "Other",
    expectedSeverity: "Low",
    expectedPii: [],
    expectedIndicators: [],
  },

  // --- Duplicates and near-misses ------------------------------------------
  {
    id: "SYN-029",
    report:
      "Another staff member got the same mail about the Treasury Portal account being blocked, with the link https://secure-verify-accounts.xyz/login. He did not click it.",
    language: "English",
    expectedCategory: "Phishing",
    expectedSeverity: "Low",
    expectedPii: ["Treasury Portal"],
    expectedIndicators: [
      { type: "URL", value: "https://secure-verify-accounts.xyz/login" },
      { type: "DOMAIN", value: "secure-verify-accounts.xyz" },
    ],
    duplicateOf: "SYN-001",
    note: "Same campaign as SYN-001 but nothing was clicked — related, and Low severity.",
  },
  {
    id: "SYN-030",
    report:
      "A legitimate password-expiry reminder from our own identity system asked staff to sign in and reset. Several people reported it as phishing because the wording looked similar to the fake one.",
    language: "English",
    expectedCategory: "Other",
    expectedSeverity: "Low",
    expectedPii: [],
    expectedIndicators: [],
    note: "Similar wording to the phishing reports but benign — tests false positives.",
  },
  {
    id: "SYN-031",
    report:
      "Ransom note appeared on a second machine in the same office, files renamed with .lokx. This is on Shared Drive D again and the team is isolating it now.",
    language: "English",
    expectedCategory: "Malware",
    expectedSeverity: "Critical",
    expectedPii: ["Shared Drive D"],
    expectedIndicators: [{ type: "SYSTEM", value: "Shared Drive D" }],
    duplicateOf: "SYN-006",
  },
  {
    id: "SYN-032",
    report:
      "Unrecognised login to a staff mailbox from an address in the same network range we saw last week, 102.89.44.19. No mail was sent from the account and the session was killed.",
    language: "English",
    expectedCategory: "Account Takeover",
    expectedSeverity: "Medium",
    expectedPii: [],
    expectedIndicators: [{ type: "IP", value: "102.89.44.19" }],
    note: "Similar to SYN-010 but a different victim and no loss — relate, do not merge.",
  },
];

export const DATASET_SUMMARY = {
  total: DATASET.length,
  byLanguage: DATASET.reduce<Record<string, number>>((acc, r) => {
    acc[r.language] = (acc[r.language] ?? 0) + 1;
    return acc;
  }, {}),
  byCategory: DATASET.reduce<Record<string, number>>((acc, r) => {
    acc[r.expectedCategory] = (acc[r.expectedCategory] ?? 0) + 1;
    return acc;
  }, {}),
  duplicates: DATASET.filter((r) => r.duplicateOf).length,
};
