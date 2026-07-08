import { PortkeyGateway } from "./gateway/portkey.js";
import { createToolRegistry } from "./tools/factory.js";
import { createToolContext } from "./tools/context.js";
import { ShouldContinueSchema, ChatResponseSchema } from "./structured-output/schemas.js";
import { validateDynamicSql } from "./guardrails/validateDynamicSql.js";

const MAX_TOOL_ROUNDS = 10;

export class Agent {
  constructor() {
    this.gateway = new PortkeyGateway();
    this.tools = createToolRegistry();
  }

  async run(request) {
    const ctx = createToolContext({
      userId: request.userId ?? "anonymous",
    });

    const messages = [
      { role: "user", content: request.message },
    ];

    const anthropicTools = Array.from(this.tools.values()).map((t) => t.anthropicTool);

    let toolRounds = 0;

    while (toolRounds < MAX_TOOL_ROUNDS) {
      toolRounds++;
      ctx.toolCallCount = toolRounds;

      const response = await this.gateway.sendMessage(
        messages,
        anthropicTools,
        {
          model: request.model,
          provider: request.provider,
          userMetadata: { userId: ctx.userId, ...request.metadata },
        },
      );

      const toolUseBlocks = response.content.filter(
        (b) => b.type === "tool_use",
      );

      if (toolUseBlocks.length === 0) {
        const textContent = response.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n");

        const shouldContinue = await this.shouldContinueGate(textContent);

        if (!shouldContinue.shouldContinue) {
          const parsed = await this.parseFinalResponse(textContent);
          return {
            success: true,
            answer: parsed.answer,
            sources: parsed.sources,
            toolCalls: toolRounds,
            usage: response.usage,
          };
        }

        messages.push({ role: "assistant", content: textContent });
        continue;
      }

      for (const toolCall of toolUseBlocks) {
        const toolDef = this.tools.get(toolCall.name);
        if (!toolDef) {
          messages.push({
            role: "assistant",
            content: `Error: Unknown tool "${toolCall.name}"`,
          });
          continue;
        }

        /* Validate input at the tool boundary */
        const parseResult = toolDef.inputSchema.safeParse(toolCall.input);
        if (!parseResult.success) {
          messages.push({
            role: "assistant",
            content: `Validation error for tool "${toolCall.name}": ${parseResult.error.message}`,
          });
          ctx.errors.push({
            tool: toolCall.name,
            message: parseResult.error.message,
            timestamp: Date.now(),
          });
          continue;
        }

        /* Guardrail: check any query-ish input against SQL injection */
        if (typeof toolCall.input.query === "string") {
          const sqlGuard = validateDynamicSql(toolCall.input.query);
          if (!sqlGuard.valid) {
            messages.push({
              role: "assistant",
              content: `Guardrail blocked: The generated query was rejected (${sqlGuard.reason}). Please try a different approach.`,
            });
            continue;
          }
        }

        const result = await toolDef.handler(parseResult.data, ctx);
        messages.push({ role: "assistant", content: result });
      }
    }

    return {
      success: false,
      error: "Max tool rounds exceeded",
      code: "MAX_ROUNDS",
      toolCalls: toolRounds,
    };
  }

  async shouldContinueGate(text) {
    const prompt = `You are a flow controller. Based on the assistant's response, should the conversation continue to gather more information or can we respond to the user?

Assistant response: "${text.slice(0, 1000)}"

Return a JSON object with: shouldContinue (boolean), reason (string), confidence (0-1).`;

    try {
      const response = await this.gateway.sendMessage([
        { role: "user", content: prompt },
      ]);

      const textContent = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return ShouldContinueSchema.parse(JSON.parse(jsonMatch[0]));
      }
    } catch {
      /* fall through */
    }

    return { shouldContinue: false, reason: "Failed to parse gate response", confidence: 0.5 };
  }

  async parseFinalResponse(text) {
    const prompt = `Parse the following assistant response into structured output:

"${text.slice(0, 2000)}"

Return a JSON object with: answer (string), sources (array of strings, optional), requiresFollowUp (boolean).`;

    try {
      const response = await this.gateway.sendMessage([
        { role: "user", content: prompt },
      ]);

      const textContent = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return ChatResponseSchema.parse(JSON.parse(jsonMatch[0]));
      }
    } catch {
      /* fall through */
    }

    return { answer: text, requiresFollowUp: false };
  }
}
