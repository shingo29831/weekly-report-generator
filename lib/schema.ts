// @ai-role: type definitions and validation schemas for external inputs

import { z } from "zod";

export const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().optional(),
});

export const settingsSchema = z.object({
  groupNumber: z.string().min(1),
  theme: z.string().min(1),
  themeDetails: z.string(),
  members: z.array(memberSchema),
});

export const reportInputSchema = z.object({
  freeMemo: z.string().optional(),
  progressRough: z.string(),
  issuesRough: z.string(),
  nextWeekRough: z.string().optional(),
  memberProgressRough: z.record(z.string(), z.string()),
  memberRolesRough: z.record(z.string(), z.string()).optional(),
});

export type Member = z.infer<typeof memberSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type ReportInput = z.infer<typeof reportInputSchema>;

export interface FormattedReport {
  progress: string;
  issues: string;
  nextWeek: string;
  trouble: string;
  memberProgress: Record<string, string>;
  memberRoles?: Record<string, string>;
}