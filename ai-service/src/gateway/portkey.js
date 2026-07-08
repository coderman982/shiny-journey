/**
 * Example 6 — Portkey gateway
 *
 * Virtual keys, per-user metadata, one-line model swap.
 * The gateway wraps the AI provider and is the only code that touches the API.
 */
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";

export class PortkeyGateway {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }

  async sendMessage(messages, tools, overrides) {
    const gwConfig = {
      provider: overrides?.provider || config.provider,
      model: overrides?.model || config.model,
      virtualKey: overrides?.virtualKey || config.portkeyVirtualKey,
      userMetadata: overrides?.userMetadata,
    };

    const anthropicTools = tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    const anthropicMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await this.anthropic.messages.create({
      model: gwConfig.model,
      max_tokens: config.maxTokens,
      messages: anthropicMessages,
      tools: anthropicTools,
      metadata: gwConfig.userMetadata
        ? { user_id: gwConfig.userMetadata.userId }
        : undefined,
    });

    return {
      id: response.id,
      content: response.content.map((block) => {
        if (block.type === "text") {
          return { type: "text", text: block.text };
        }
        return {
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input,
        };
      }),
      stopReason: response.stop_reason ?? null,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  swapModel(newModel) {
    config.model = newModel;
    console.log(`[gateway] model swapped to: ${newModel}`);
  }

  swapProvider(newProvider) {
    config.provider = newProvider;
    console.log(`[gateway] provider swapped to: ${newProvider}`);
  }
}
