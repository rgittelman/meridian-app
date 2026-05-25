/**
 * lib/cognition/response-filter.ts — Post-processing quality filter.
 *
 * Cleans local-model output before display/persistence.
 * Heuristic-only — no LLM call.
 */

import type { ToneState } from "./types";

export interface FilterInput {
  rawResponse:   string;
  toneState:     string;
  userMessage:   string;
  memoryHints?:  string[];
  patternHints?: string[];
}

const ASSISTANT_OPENERS: RegExp[] = [
  /^I understand[,.]?\s*/i,
  /^It sounds like\s+/i,
  /^It seems like\s+/i,
  /^That sounds\s+(really\s+|very\s+)?(hard|tough|difficult|challenging)[,.]?\s*/i,
  /^I hear you[,.]?\s*/i,
  /^I'm here to help[,.]?\s*/i,
  /^I'm sorry to hear[^.!?]*[.!?]\s*/i,
  /^That's a great\s+(question|start|point|goal)[,.]?\s*/i,
  /^Great question[,.]?\s*/i,
  /^Absolutely[,!.]?\s*/i,
  /^Of course[,!.]?\s*/i,
  /^I'd be happy to\s+/i,
  /^I appreciate you sharing[^.!?]*[.!?]\s*/i,
  /^Thank you for sharing[^.!?]*[.!?]\s*/i,
];

const ASSISTANT_INLINE: RegExp[] = [
  /\bWould you like me to\s+/gi,
  /\bHow about\s+(trying|setting up|creating)\s+/gi,
  /\bOne thing you could do is\s+/gi,
  /\bA helpful strategy might be to\s+/gi,
  /\bI'm here to help\b/gi,
  /\bThat's completely valid\b/gi,
  /\bIt's completely normal to\b/gi,
  /\bIt's normal to\b/gi,
  /\bYou've got this\b/gi,
  /\bDon't hesitate to\b/gi,
  /\bFeel free to\b/gi,
  /\bI'd love to help you\b/gi,
  /\bI'd suggest\b/gi,
  /\bI recommend\b/gi,
  /\bKeep up the great work\b/gi,
  /\bKeep going\b[!.]?\s*/gi,
  /\bYou're doing great\b/gi,
  /\bThat's a wonderful\b/gi,
  /\bThat's really great\b/gi,
  /\bI'm proud of you\b/gi,
];

const THERAPY_PHRASES: RegExp[] = [
  /\bHow does that make you feel\b/gi,
  /\bThat's a valid feeling\b/gi,
  /\bIt's okay to feel\b/gi,
  /\bGive yourself grace\b/gi,
  /\bBe kind to yourself\b/gi,
  /\bself-care journey\b/gi,
];

const META_SENTENCE_RE =
  /\b(memory|memories|prompt|retrieval|tone state|memory system|stored knowledge|I remember|you told me)\b/i;

const GENERIC_PRODUCTIVITY = [
  "template", "templates", "launch pad", "launchpad", "checklist",
  "productivity hack", "productivity system", "time-blocking",
  "pomodoro",
];

const FILLER_PATTERNS: RegExp[] = [
  /\bIn today's fast-paced world\b/gi,
  /\bAt the end of the day\b/gi,
  /\bIt's important to remember that\b/gi,
  /\bHope this helps\b[!.]?\s*/gi,
  /\bLet me know if (?:you'd like|you want)[^.!?]*[.!?]\s*/gi,
];

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinSentences(sentences: string[]): string {
  return sentences.join(" ").trim();
}

function stripOpeners(text: string): string {
  let out = text.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of ASSISTANT_OPENERS) {
      const next = out.replace(re, "");
      if (next !== out) { out = next.trim(); changed = true; }
    }
  }
  return out;
}

function stripInlinePhrases(text: string): string {
  let out = text;
  for (const re of [...ASSISTANT_INLINE, ...THERAPY_PHRASES, ...FILLER_PATTERNS]) {
    out = out.replace(re, "");
  }
  out = out.replace(/^\s*help you\s+/i, "");
  return out.replace(/\s{2,}/g, " ").trim();
}

function removeMetaSentences(text: string): string {
  const sentences = splitSentences(text);
  const kept: string[] = [];

  for (const s of sentences) {
    if (!META_SENTENCE_RE.test(s)) {
      kept.push(s);
      continue;
    }
    // Extract useful clause after meta preamble: "Based on X, you prefer Y"
    const clause = s.replace(/^[^,]+,\s*/i, "").trim();
    if (clause.length > 12 && !META_SENTENCE_RE.test(clause)) {
      kept.push(capitalizeFirst(clause));
    }
  }

  return kept.length > 0 ? joinSentences(kept) : joinSentences(sentences.slice(-1));
}

function limitQuestions(text: string, max = 1): string {
  const sentences = splitSentences(text);
  const questions = sentences.filter((s) => s.includes("?"));
  if (questions.length <= max) return text;

  const keep = questions[questions.length - 1];
  const nonQuestions = sentences.filter((s) => !s.includes("?"));
  return joinSentences([...nonQuestions, keep]);
}

function userMentionsProductivityTools(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  return GENERIC_PRODUCTIVITY.some((term) => lower.includes(term));
}

function suppressGenericProductivity(text: string, userMessage: string): string {
  if (userMentionsProductivityTools(userMessage)) return text;

  const sentences = splitSentences(text);
  const filtered = sentences.filter((s) => {
    const lower = s.toLowerCase();
    const hits = GENERIC_PRODUCTIVITY.filter((term) => lower.includes(term));
    if (hits.length === 0) return true;
    const userWords = userMessage.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    return userWords.some((w) => lower.includes(w));
  });

  return filtered.length > 0 ? joinSentences(filtered) : joinSentences(sentences.slice(0, 1));
}

/** Rewrite advice-first phrasing into observation-first. Run before inline stripping. */
function convertAdviceFirst(
  text: string,
  _userMessage: string,
  memoryHints?: string[],
): string {
  let out = text;

  const considerMatch = out.match(/Have you considered\s+(.+?)([.!?]|$)/i);
  if (considerMatch) {
    const suggestion = considerMatch[1].replace(/\?+$/, "").trim();
    const hint = memoryHints?.[0];
    const replacement = hint
      ? `${hint.charAt(0).toUpperCase()}${hint.slice(1)}`
      : `The friction probably isn't ${suggestion.toLowerCase()} — it's likely the transition that's hard.`;
    out = out.replace(considerMatch[0], `${replacement}.`);
  }

  out = out.replace(/\bHow about\s+/gi, "");
  return out;
}

function removeLists(text: string): string {
  const lines = text.split("\n").filter((line) => {
    const t = line.trim();
    return !/^[-•*\d]+[.)]\s/.test(t) && !/^\d+\.\s/.test(t);
  });
  return lines.join(" ").replace(/\s{2,}/g, " ").trim();
}

function truncateSentences(text: string, max: number): string {
  return joinSentences(splitSentences(text).slice(0, max));
}

function applyToneShaping(text: string, toneState: string): string {
  const tone = toneState as ToneState;

  switch (tone) {
    case "low_energy":
      return truncateSentences(
        text.replace(/\b(?:you should|try to|make sure to|focus on)\b/gi, ""),
        2,
      );
    case "overwhelmed":
      return truncateSentences(removeLists(text), 3);
    case "planning":
      return truncateSentences(text, 4);
    case "emotional":
      return truncateSentences(text, 2);
    default:
      return truncateSentences(text, 3);
  }
}

function cleanupPunctuation(text: string): string {
  return text
    .replace(/\s+([.!?,])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .replace(/^\s*[,.]\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function removeOrphanFragments(text: string): string {
  const orphans = [
    /^Feel this way[.?!]*$/i,
    /^Help you set up[^.]*[.?!]*$/i,
    /^To feel this way[.?!]*$/i,
  ];
  if (orphans.some((re) => re.test(text.trim()))) return "";
  return text;
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function salvageSentence(raw: string): string {
  const stripped = stripInlinePhrases(stripOpeners(raw));
  const sentences = splitSentences(stripped);
  const clean = sentences.filter(
    (s) => !BANNED_RE.test(s) &&
      !THERAPY_PHRASES.some((re) => re.test(s)) &&
      !/^feel this way/i.test(s) &&
      s.length > 15,
  );
  if (clean.length) return clean[clean.length - 1];
  const fallback = sentences.find((s) => s.length > 8 && !BANNED_RE.test(s));
  return fallback ?? stripped;
}

const BANNED_RE = /\b(would you like me to|have you considered|it sounds like|i understand|completely normal|how does that make you feel|tone state|stored memories)\b/i;

function isGarbled(text: string): boolean {
  if (text.length < 8) return true;
  if (/^(To feel|suggests rest)\b/i.test(text)) return true;
  if (BANNED_RE.test(text)) return true;
  return false;
}

/** Split filtered text into chunks for pseudo-streaming after buffer. */
export function chunkForStream(text: string): string[] {
  const sentences = splitSentences(text);
  if (sentences.length <= 1) return text ? [text] : [];
  return sentences.map((s, i) => (i < sentences.length - 1 ? `${s} ` : s));
}

/** Main filter entry point. */
export function filterMeridianResponse(input: FilterInput): string {
  if (!input.rawResponse?.trim()) return input.rawResponse ?? "";

  const raw = input.rawResponse.trim();

  let text = stripOpeners(raw);
  text = convertAdviceFirst(text, input.userMessage, input.memoryHints);
  text = stripInlinePhrases(text);
  text = removeMetaSentences(text);
  text = suppressGenericProductivity(text, input.userMessage);
  text = limitQuestions(text, 1);
  text = applyToneShaping(text, input.toneState);
  text = cleanupPunctuation(text);
  text = capitalizeFirst(text);

  if (input.toneState === "emotional") {
    text = splitSentences(text).filter((s) => !THERAPY_PHRASES.some((re) => re.test(s))).join(" ");
  }

  text = removeOrphanFragments(text);

  if (isGarbled(text)) {
    text = capitalizeFirst(
      cleanupPunctuation(
        applyToneShaping(
          limitQuestions(
            suppressGenericProductivity(
              removeMetaSentences(
                stripInlinePhrases(stripOpeners(raw)),
              ),
              input.userMessage,
            ),
            1,
          ),
          input.toneState,
        ),
      ),
    );
  }

  if (isGarbled(text) || BANNED_RE.test(text)) {
    const minimal = truncateSentences(
      stripInlinePhrases(stripOpeners(raw)),
      1,
    );
    text = minimal.length >= 10 ? capitalizeFirst(cleanupPunctuation(minimal)) : text;
  }

  if (!text || isGarbled(text) || BANNED_RE.test(text)) {
    text = capitalizeFirst(cleanupPunctuation(truncateSentences(salvageSentence(raw), 2)));
  }

  return removeOrphanFragments(text) || capitalizeFirst(truncateSentences(salvageSentence(raw), 1));
}

/** Dev helper — diff summary for logging. */
export function filterDiff(before: string, after: string): {
  charsBefore: number;
  charsAfter:  number;
  changed:     boolean;
} {
  return {
    charsBefore: before.length,
    charsAfter:  after.length,
    changed:     before.trim() !== after.trim(),
  };
}
