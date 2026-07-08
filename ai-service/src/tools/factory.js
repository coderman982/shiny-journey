/**
 * Example 2 — The tool factory
 *
 * A factory that creates tool handlers. Each handler is a closure over the
 * ToolContext, giving it shared mutable state. The factory + registry + name
 * is a triple-update footgun (seen in FlyRank) — change one, forget the other.
 *
 * Each tool has:
 *   - A Zod schema for input validation at the boundary
 *   - A handler function that receives validated input + the shared context
 *   - An Anthropic tool definition (name, description, input_schema)
 */
import { z } from "zod";
import { NOTEBOOK, WEATHER } from "./data.js";

/* ── Tool 1: search_notes ───────────────────────────── */

const searchNotesSchema = z.object({
  query: z.string().min(1).max(200),
  maxResults: z.number().int().min(1).max(20).optional().default(5),
});

async function searchNotesHandler(input, ctx) {
  const q = input.query.toLowerCase();
  const results = Object.entries(NOTEBOOK)
    .filter(([key, val]) => key.toLowerCase().includes(q) || val.toLowerCase().includes(q))
    .slice(0, input.maxResults);

  ctx.toolCallCount++;
  ctx.data.lastSearchQuery = input.query;

  if (results.length === 0) {
    return JSON.stringify({ found: false, message: "No matching notes found." });
  }

  return JSON.stringify({
    found: true,
    count: results.length,
    results: results.map(([key, val]) => ({ id: key, content: val })),
  });
}

/* ── Tool 2: get_weather ────────────────────────────── */

const getWeatherSchema = z.object({
  location: z.string().min(1).max(100),
  units: z.enum(["celsius", "fahrenheit"]).optional().default("celsius"),
});

async function getWeatherHandler(input, ctx) {
  const loc = input.location.toLowerCase().trim();
  ctx.toolCallCount++;

  const weather = WEATHER[loc];
  if (!weather) {
    ctx.errors.push({ tool: "get_weather", message: `Unknown location: ${input.location}`, timestamp: Date.now() });
    return JSON.stringify({ found: false, message: `Weather data not available for '${input.location}'.` });
  }

  return JSON.stringify({ found: true, location: input.location, weather, units: input.units });
}

/* ── Tool 3: calculator ─────────────────────────────── */

const calculatorSchema = z.object({
  expression: z.string().min(1).max(500),
});

async function calculatorHandler(input, ctx) {
  ctx.toolCallCount++;
  const sanitized = input.expression.replace(/[^0-9+\-*/.() ]/g, "");
  try {
    const result = Function(`"use strict"; return (${sanitized})`)();
    return JSON.stringify({ expression: input.expression, result });
  } catch {
    ctx.errors.push({ tool: "calculator", message: `Invalid expression: ${input.expression}`, timestamp: Date.now() });
    return JSON.stringify({ error: "Invalid mathematical expression." });
  }
}

/* ── Helpers ─────────────────────────────────────────── */

function zodToJsonSchema(schema) {
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const properties = {};
    for (const [key, val] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(val);
    }
    return { type: "object", properties };
  }
  if (schema instanceof z.ZodString) return { type: "string" };
  if (schema instanceof z.ZodNumber) return { type: "number" };
  if (schema instanceof z.ZodBoolean) return { type: "boolean" };
  if (schema instanceof z.ZodEnum) return { type: "string", enum: schema._def.values };
  if (schema instanceof z.ZodArray) {
    return { type: "array", items: zodToJsonSchema(schema.element) };
  }
  if (schema instanceof z.ZodOptional) return zodToJsonSchema(schema.unwrap());
  return { type: "string" };
}

function createAnthropicTool(name, description, schema) {
  return {
    name,
    description,
    input_schema: zodToJsonSchema(schema),
  };
}

/* ── Factory — returns a registry Map ───────────────── */

export function createToolRegistry() {
  const registry = new Map();

  const tools = [
    {
      name: "search_notes",
      description: "Search the internal notebook for notes matching a query",
      inputSchema: searchNotesSchema,
      anthropicTool: createAnthropicTool("search_notes", "Search the internal notebook for notes matching a query", searchNotesSchema),
      handler: searchNotesHandler,
    },
    {
      name: "get_weather",
      description: "Get the current weather for a given location",
      inputSchema: getWeatherSchema,
      anthropicTool: createAnthropicTool("get_weather", "Get the current weather for a given location", getWeatherSchema),
      handler: getWeatherHandler,
    },
    {
      name: "calculator",
      description: "Evaluate a mathematical expression",
      inputSchema: calculatorSchema,
      anthropicTool: createAnthropicTool("calculator", "Evaluate a mathematical expression", calculatorSchema),
      handler: calculatorHandler,
    },
  ];

  for (const t of tools) {
    registry.set(t.name, t);
  }

  return registry;
}
