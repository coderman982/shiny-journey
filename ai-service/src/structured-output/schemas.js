/**
 * Example 3 — Structured-output presets + shouldContinue flow gate
 *
 * The model returns structured data; we parse it through Zod, then branch on
 * the shouldContinue field to decide if we keep looping or return to the user.
 */
import { z } from "zod";

export const ShouldContinueSchema = z.object({
  shouldContinue: z.boolean().describe("Whether to continue the agent loop"),
  reason: z.string().describe("Brief reason for the decision"),
  confidence: z.number().min(0).max(1).describe("Confidence in this decision"),
});

export const ChatResponseSchema = z.object({
  answer: z.string().describe("The final answer to the user"),
  sources: z
    .array(z.string())
    .optional()
    .describe("Sources referenced in the answer"),
  requiresFollowUp: z.boolean().describe("Whether follow-up is needed"),
});

export const AgentStateSchema = z.object({
  thoughts: z.string().describe("The model's reasoning"),
  nextAction: z.enum(["use_tool", "respond", "terminate"]),
  toolName: z.string().optional(),
  toolInput: z.record(z.unknown()).optional(),
});
