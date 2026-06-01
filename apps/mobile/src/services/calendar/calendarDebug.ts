/** Temporary __DEV__ logging for Google Calendar fetch debugging */

function maskToken(token: string): string {
  if (token.length <= 12) return '***';
  return `${token.slice(0, 6)}…${token.slice(-4)} (${token.length} chars)`;
}

export function logCalendarDebug(label: string, payload: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.log(`[Calendar] ${label}`, payload);
}

export function logTokenStorage(action: 'save' | 'load' | 'clear', detail: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.log(`[Calendar] token ${action}`, detail);
}

export async function logGoogleTokenInfo(accessToken: string): Promise<void> {
  if (!__DEV__) return;

  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    const body = await res.text();
    logCalendarDebug('tokeninfo response', {
      status: res.status,
      ok: res.ok,
      body,
      token: maskToken(accessToken),
    });
  } catch (err) {
    logCalendarDebug('tokeninfo failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export { maskToken };
