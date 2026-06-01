/**
 * Safe string helpers for calendar / inference pipelines.
 * Never call string methods on possibly-missing API or parse fields.
 */

export function safeString(value: string | null | undefined, fallback = ''): string {
  if (value == null) return fallback;
  if (typeof value !== 'string') return fallback;
  return value;
}

export function safeLower(value: string | null | undefined, fallback = ''): string {
  return safeString(value, fallback).toLowerCase();
}

export function safeTrim(value: string | null | undefined, fallback = ''): string {
  return safeString(value, fallback).trim();
}

export function safeIncludes(
  haystack: string | null | undefined,
  needle: string,
): boolean {
  return safeLower(haystack).includes(safeLower(needle));
}
