/**
 * AI Service — one endpoint that routes through a gateway, returns validated
 * structured output, and handles a forced error path.
 *
 * Foundations: Anthropic (Claude) → Portkey (gateway) → structured output
 * Advanced: 3-tool agent over own data, input validation at every boundary,
 * guardrail on generated queries, provider/model swappable by config.
 */
import express from "express";
import { config } from "./config.js";
import { Agent } from "./agent.js";

const app = express();
app.use(express.json());

const agent = new Agent();

/* ── Forced error path middleware ───────────────────── */
app.use((req, res, next) => {
  const forceError = req.headers["x-force-error"];
  if (forceError) {
    req.forceError = forceError;
  }
  next();
});

/* ── Health ─────────────────────────────────────────── */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    provider: config.provider,
    model: config.model,
  });
});

/* ── POST /chat ─────────────────────────────────────── */
app.post("/chat", async (req, res, next) => {
  try {
    const { message, userId, metadata, model, provider } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid 'message' field",
        code: "BAD_REQUEST",
        recoverable: true,
      });
      return;
    }

    /* Forced error path — triggered by X-Force-Error header */
    if (req.forceError) {
      const scenario = req.forceError;
      const errors = {
        gateway_timeout: { status: 504, error: "AI_GATEWAY_TIMEOUT: The upstream provider did not respond in time", code: "AI_GATEWAY_TIMEOUT" },
        validation_failure: { status: 422, error: "VALIDATION_FAILURE: The structured output did not match the expected schema", code: "VALIDATION_FAILURE" },
        guardrail_block: { status: 403, error: "GUARDRAIL_BLOCK: The generated content was rejected by the safety layer", code: "GUARDRAIL_BLOCK" },
        tool_timeout: { status: 408, error: "TOOL_TIMEOUT: A tool execution exceeded the maximum allowed time", code: "TOOL_TIMEOUT" },
        rate_limited: { status: 429, error: "RATE_LIMITED: Too many requests — please try again later", code: "RATE_LIMITED" },
      };
      const err = errors[scenario] || errors.gateway_timeout;
      res.status(err.status).json({ success: false, ...err, recoverable: err.status < 500 });
      return;
    }

    const result = await agent.run({ message, userId, metadata, model, provider });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/* ── POST /swap-model — one-line model swap (Example 6) ── */
app.post("/swap-model", (req, res) => {
  const { model } = req.body;
  if (!model || typeof model !== "string") {
    res.status(400).json({ error: "Missing 'model' field" });
    return;
  }
  agent.gateway.swapModel(model);
  res.json({ success: true, model });
});

/* ── POST /swap-provider ─────────────────────────────── */
app.post("/swap-provider", (req, res) => {
  const { provider } = req.body;
  if (!provider || typeof provider !== "string") {
    res.status(400).json({ error: "Missing 'provider' field" });
    return;
  }
  agent.gateway.swapProvider(provider);
  res.json({ success: true, provider });
});

/* ── Global error handler ────────────────────────────── */
app.use((err, req, res, next) => {
  console.error(`[error] ${err.message}`);
  const statusCode = err.message.startsWith("AI_GATEWAY_TIMEOUT") ? 504
    : err.message.startsWith("VALIDATION_FAILURE") ? 422
    : err.message.startsWith("GUARDRAIL_BLOCK") ? 403
    : err.message.startsWith("TOOL_TIMEOUT") ? 408
    : err.message.startsWith("RATE_LIMITED") ? 429
    : 500;

  res.status(statusCode).json({
    success: false,
    error: err.message,
    code: err.message.split(":")[0],
    recoverable: statusCode < 500,
  });
});

app.listen(config.port, () => {
  console.log(`\n  AI Service running at http://localhost:${config.port}`);
  console.log(`  Provider: ${config.provider}`);
  console.log(`  Model:    ${config.model}`);
  console.log(`  Gateway:  Portkey (virtual keys, per-user metadata)`);
  console.log(`  Guardrail: lexical SQL validation`);
  console.log(`  Error path: X-Force-Error header\n`);
});
