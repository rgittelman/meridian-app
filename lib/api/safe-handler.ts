/**
 * lib/api/safe-handler.ts — Top-level error boundary for API route handlers.
 *
 * Wraps a handler function with try/catch so unhandled exceptions
 * return a clean 500 JSON response instead of leaking stack traces.
 */

import { apiError } from "./auth";

export function safeHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[api] unhandled:", err instanceof Error ? err.message : err);
      return apiError("Something went wrong", 500);
    }
  };
}
