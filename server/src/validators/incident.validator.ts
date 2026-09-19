import { z } from "zod";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
  LANGUAGE_HINTS,
  RESPONSE_TEAMS,
  SEVERITY_LEVELS,
} from "../types/domain";

/** Accepts either `?severity=Critical&severity=High` or `?severity=Critical,High`. */
const csv = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((input) => {
      if (input === undefined) return undefined;
      const list = Array.isArray(input) ? input : input.split(",");
      const cleaned = list.map((v) => v.trim()).filter((v) => (values as readonly string[]).includes(v));
      return cleaned.length ? (cleaned as unknown as T[number][]) : undefined;
    });

export const createIncidentSchema = z.object({
  report: z
    .string({ required_error: "A report is required" })
    .trim()
    .min(12, "A report needs at least 12 characters to be worth triaging")
    .max(20_000, "Reports are capped at 20,000 characters"),
  languageHint: z.enum(LANGUAGE_HINTS).optional().default("Auto-detect"),
});
export type CreateIncidentBody = z.infer<typeof createIncidentSchema>;

export const listIncidentsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  severity: csv(SEVERITY_LEVELS),
  category: csv(INCIDENT_CATEGORIES),
  status: csv(INCIDENT_STATUSES),
  team: csv(RESPONSE_TEAMS),
  filter: z.enum(["All", "Critical", "High", "Unreviewed"]).optional(),
  sort: z.enum(["newest", "oldest", "severity", "confidence"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});
export type ListIncidentsQueryInput = z.infer<typeof listIncidentsSchema>;

export const incidentIdSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^INC-\d+$/i, "Incident IDs look like INC-104")
    .transform((v) => v.toUpperCase()),
});

export const updateIncidentSchema = z
  .object({
    status: z.enum(INCIDENT_STATUSES).optional(),
    severity: z.enum(SEVERITY_LEVELS).optional(),
    assignedTeam: z.enum(RESPONSE_TEAMS).optional(),
    title: z.string().trim().min(4).max(160).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
