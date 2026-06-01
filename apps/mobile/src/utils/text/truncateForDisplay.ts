/**
 * Truncates display text at a natural boundary (sentence, clause, or word)
 * so cards never clip mid-word ("Mac and che...").
 */
export function truncateAtNaturalBoundary(
  text: string,
  maxLength = 72,
): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const slice = trimmed.slice(0, maxLength + 1);

  const commaCount = (slice.match(/, /g) ?? []).length;
  if (commaCount >= 2) {
    let commaIdx = -1;
    for (let i = 0; i < 2; i++) {
      commaIdx = slice.indexOf(', ', commaIdx + 1);
    }
    if (commaIdx > 0 && commaIdx >= maxLength * 0.3) {
      return `${trimmed.slice(0, commaIdx).trim()}…`;
    }
  }

  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
  );
  if (sentenceEnd >= maxLength * 0.4) {
    return trimmed.slice(0, sentenceEnd + 1).trim();
  }

  const clauseEnd = Math.max(
    slice.lastIndexOf(', '),
    slice.lastIndexOf('; '),
  );
  if (clauseEnd >= maxLength * 0.45) {
    return `${trimmed.slice(0, clauseEnd).trim()}…`;
  }

  const wordEnd = slice.lastIndexOf(' ');
  if (wordEnd >= maxLength * 0.5) {
    let cut = trimmed.slice(0, wordEnd).trim();
    const partialApostrophe = cut.match(/'\s*$/);
    if (partialApostrophe) {
      const safer = cut.lastIndexOf(' ');
      if (safer > 0) cut = cut.slice(0, safer).trim();
    }
    return `${cut}…`;
  }

  return `${trimmed.slice(0, maxLength).trim()}…`;
}
