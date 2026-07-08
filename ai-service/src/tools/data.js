/**
 * Own data — the internal knowledge base tools operate over.
 * In production this could be a vector DB, but here it's plain objects.
 */
export const NOTEBOOK = {
  "meeting-notes-q1": "Q1 revenue grew 12% driven by enterprise segment. Key accounts: Acme Corp ($2.1M), Beta Inc ($1.8M).",
  "product-roadmap": "Q2 priorities: v2.3 search improvements, v2.4 mobile app, v2.5 AI features. Launch dates: June, September, December.",
  "engineering-notes": "Migrated CI/CD to GitHub Actions. Pending: migrate test suite from Jest to Vitest. Current test coverage: 87%.",
};

export const WEATHER = {
  "new-york": "22°C, partly cloudy",
  "london": "15°C, light rain",
  "tokyo": "28°C, sunny",
  "sydney": "18°C, clear",
};
