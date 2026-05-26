/**
 * GET /api/version — Returns current build metadata.
 * Used by the client to detect when a new deployment is available.
 * Must be fetched with cache: "no-store" to bypass edge/CDN caching.
 */

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      buildId:     process.env.NEXT_PUBLIC_BUILD_ID ?? "dev",
      builtAt:     process.env.NEXT_PUBLIC_BUILT_AT ?? null,
      environment: process.env.NODE_ENV ?? "development",
    },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
}
