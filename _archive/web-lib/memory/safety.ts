/**
 * Meridian Memory — safety filters.
 *
 * Prevents sensitive credentials, tokens, and PII-heavy content
 * from entering the memory layer.
 */

/** Patterns that must never be stored in memory tables. */
const BLOCKED_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/i,
  /sk-[A-Za-z0-9]{20,}/,
  /api[_-]?key\s*[:=]\s*\S+/i,
  /access[_-]?token\s*[:=]\s*\S+/i,
  /refresh[_-]?token\s*[:=]\s*\S+/i,
  /client[_-]?secret\s*[:=]\s*\S+/i,
  /password\s*[:=]\s*\S+/i,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b.*password/i,
];

/** OAuth provider names — content referencing raw credential storage is blocked. */
const CREDENTIAL_KEYWORDS = [
  "oauth token",
  "refresh token",
  "access token",
  "client secret",
  "api secret",
  "private key",
  "service role",
];

/**
 * Returns true if the text appears safe to store as a memory.
 * Blocks OAuth credentials, API keys, and bearer tokens.
 */
export function isSafeToStore(text: string): boolean {
  const lower = text.toLowerCase();

  for (const keyword of CREDENTIAL_KEYWORDS) {
    if (lower.includes(keyword)) return false;
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) return false;
  }

  return true;
}

/**
 * Sanitizes memory content by stripping blocked patterns.
 * Returns null if the content is entirely unsafe.
 */
export function sanitizeMemoryContent(text: string): string | null {
  if (!isSafeToStore(text)) return null;

  let sanitized = text;
  for (const pattern of BLOCKED_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[redacted]");
  }

  return sanitized.trim() || null;
}

/**
 * Validates an extracted memory object before persistence.
 */
export function validateExtractedMemory(memory: {
  title:   string;
  content: string;
  why_remembered?: string;
}): boolean {
  const fields = [memory.title, memory.content, memory.why_remembered ?? ""];
  return fields.every((f) => !f || isSafeToStore(f));
}
