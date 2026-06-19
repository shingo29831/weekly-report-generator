// @ai-role: type definitions and validation schemas for external inputs

import { z } from "zod";

export const taskSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  progress: z.number().min(0).max(100),
  isCompleted: z.boolean(),
});

export const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().optional(),
});

export const settingsSchema = z.object({
  groupNumber: z.string().min(1),
  theme: z.string().min(1),
  themeDetails: z.string(),
  projectGoal: z.string().default(""),
  members: z.array(memberSchema),
  tasks: z.array(taskSchema).default([]),
  teamProgress: z.number().min(0).max(100).default(0),
});

export const reportInputSchema = z.object({
  freeMemo: z.string().optional(),
  progressRough: z.string(),
  issuesRough: z.string(),
  nextWeekRough: z.string().optional(),
  memberProgressRough: z.record(z.string(), z.string()),
  memberRolesRough: z.record(z.string(), z.string()).optional(),
});

export const formattedReportSchema = z.object({
  progress: z.string(),
  issues: z.string(),
  nextWeek: z.string(),
  trouble: z.string(),
  memberProgress: z.record(z.string(), z.string()),
  memberRoles: z.record(z.string(), z.string()).optional(),
  updatedThemeDetails: z.string().optional(),
  updatedProjectGoal: z.string().optional(),
  updatedTasks: z.array(taskSchema).optional(),
  teamProgress: z.number().min(0).max(100).optional(),
});

export type Task = z.infer<typeof taskSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type ReportInput = z.infer<typeof reportInputSchema>;
export type FormattedReport = z.infer<typeof formattedReportSchema>;