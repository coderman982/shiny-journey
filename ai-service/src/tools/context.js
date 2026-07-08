/**
 * ToolContext — shared mutable state carried through closures.
 *
 * Each tool call gets a context snapshot; the factory closes over the same
 * mutable context object so tools can read/write shared state across turns.
 */
import crypto from "crypto";

export function createToolContext(overrides) {
  return {
    requestId: overrides?.requestId ?? crypto.randomUUID(),
    userId: overrides?.userId ?? "anonymous",
    conversationHistory: overrides?.conversationHistory ?? [],
    toolCallCount: overrides?.toolCallCount ?? 0,
    data: overrides?.data ?? {},
    errors: overrides?.errors ?? [],
  };
}
