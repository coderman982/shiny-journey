import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  provider: process.env.AI_PROVIDER || "anthropic",
  model: process.env.AI_MODEL || "claude-sonnet-4-20250514",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  portkeyApiKey: process.env.PORTKEY_API_KEY || "",
  portkeyVirtualKey: process.env.PORTKEY_VIRTUAL_KEY || "",
  maxTokens: 4096,
};
