/**
 * Example 5 — validateDynamicSql
 *
 * A lexical guardrail (not semantic — ≈95% of safety for ≈10% of a parser's cost).
 * Strategy: strip-before-check → denylist → adversarial tests.
 *
 * The model generates a SQL query. Before execution, we strip benign tokens,
 * then check for dangerous patterns. This is a *lexical* guardrail —
 * it catches script kiddies and accidental injections, not a determined
 * adversary with encoding tricks. The second layer is a dry-run cost check
 * and rate limit.
 *
 * FlyRank's real trade-off: lexical ≈95% safety for ≈10% of the parser cost.
 */

const DENYLIST = [
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bEXEC\b/i,
  /\bEXECUTE\b/i,
  /\bINTO\s+OUTFILE\b/i,
  /\bINTO\s+DUMPFILE\b/i,
  /\bLOAD_FILE\b/i,
  /\bSLEEP\b/i,
  /\bWAITFOR\b/i,
  /\bBENCHMARK\b/i,
  /\bpg_sleep\b/i,
  /\bUNION\b/i,
  /\bOR\s+'1'='1'/i,
  /\bOR\s+1=1\b/i,
  /;\s*$/,
  /--/,
  /\/\*/,
  /@@version/i,
  /information_schema/i,
];

const STRIP_PATTERNS = [
  /\s+/g,
  /\bSELECT\b/gi,
  /\bFROM\b/gi,
  /\bWHERE\b/gi,
  /\bAND\b/gi,
  /\bLIMIT\b/gi,
  /\bORDER\s+BY\b/gi,
  /\bGROUP\s+BY\b/gi,
  /\bHAVING\b/gi,
  /\bAS\b/gi,
  /\bON\b/gi,
  /\bJOIN\b/gi,
  /\bLEFT\b/gi,
  /\bRIGHT\b/gi,
  /\bINNER\b/gi,
  /\bOUTER\b/gi,
  /\bCROSS\b/gi,
  /\bNULL\b/gi,
  /\bIS\b/gi,
  /\bNOT\b/gi,
  /\bIN\b/gi,
  /\bBETWEEN\b/gi,
  /\bLIKE\b/gi,
  /\bCOUNT\b/gi,
  /\bSUM\b/gi,
  /\bAVG\b/gi,
  /\bMIN\b/gi,
  /\bMAX\b/gi,
  /\bCASE\b/gi,
  /\bWHEN\b/gi,
  /\bTHEN\b/gi,
  /\bELSE\b/gi,
  /\bEND\b/gi,
  /\bCAST\b/gi,
  /\bCOALESCE\b/gi,
  /['"`()]/g,
  /[0-9]/g,
];

/**
 * Strip benign SQL tokens before running denylist check.
 * This reduces false positives on safe queries.
 */
function stripBenign(sql) {
  let cleaned = sql;
  for (const pat of STRIP_PATTERNS) {
    cleaned = cleaned.replace(pat, " ");
  }
  return cleaned.trim();
}

/**
 * Validate a dynamically generated SQL query.
 * Returns { valid: false, reason: ... } for dangerous queries.
 */
export function validateDynamicSql(sql) {
  const stripped = stripBenign(sql);

  for (const pattern of DENYLIST) {
    if (pattern.test(stripped) || pattern.test(sql)) {
      return {
        valid: false,
        originalQuery: sql,
        strippedQuery: stripped,
        reason: "Guardrail blocked: dangerous SQL pattern detected",
        matchedPattern: pattern.source,
      };
    }
  }

  return {
    valid: true,
    originalQuery: sql,
  };
}

/* ── Adversarial test cases ─────────────────────────── */

export const ADVERSARIAL_TESTS = [
  { name: "simple select", sql: "SELECT * FROM users WHERE id = 1", shouldBlock: false },
  { name: "benign join", sql: "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id", shouldBlock: false },
  { name: "aggregate", sql: "SELECT COUNT(*) FROM products WHERE price > 100", shouldBlock: false },
  { name: "drop table", sql: "SELECT * FROM users; DROP TABLE users;", shouldBlock: true },
  { name: "deception", sql: "DELETE FROM users WHERE id = 1", shouldBlock: true },
  { name: "union injection", sql: "SELECT name FROM users UNION SELECT password FROM admins", shouldBlock: true },
  { name: "comment injection", sql: "SELECT * FROM users WHERE id = 1 OR 1=1--", shouldBlock: true },
  { name: "xp_cmdshell", sql: "EXEC xp_cmdshell 'dir'", shouldBlock: true },
  { name: "sleep injection", sql: "SELECT * FROM products WHERE id = 1 OR SLEEP(5)", shouldBlock: true },
  { name: "blind sql", sql: "SELECT * FROM users WHERE id = 1 AND 1=(SELECT COUNT(*) FROM admins)", shouldBlock: false },
  { name: "insert", sql: "INSERT INTO users VALUES ('admin', 'password')", shouldBlock: true },
  { name: "alter table", sql: "ALTER TABLE users ADD COLUMN admin BIT", shouldBlock: true },
];
