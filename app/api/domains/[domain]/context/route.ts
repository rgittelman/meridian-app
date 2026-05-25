/**
 * GET /api/domains/[domain]/context — Domain-scoped memory context
 *
 * Used by /health, /money, /life pages for automatic domain retrieval.
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { assembleDomainContext } from "@/lib/domains/retrieve";
import { LIFE_DOMAINS, ROUTE_DOMAIN_MAP } from "@/lib/domains/types";
import type { LifeDomain } from "@/lib/domains/types";

export const GET = safeHandler(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { domain: raw } = await params;
  const mapped = ROUTE_DOMAIN_MAP[raw] ?? raw;
  if (!(LIFE_DOMAINS as readonly string[]).includes(mapped)) {
    return apiError(`Unknown domain. Valid: ${LIFE_DOMAINS.join(", ")}`, 400);
  }

  const query = req.nextUrl.searchParams.get("q") ?? undefined;
  const context = await assembleDomainContext(
    auth.user.id,
    mapped as LifeDomain,
    query,
  );

  return Response.json({
    domain:   context.domain,
    themes:   context.themes,
    memories: context.memories.map((m) => ({
      id:       m.id,
      title:    m.title,
      summary:  m.summary,
      category: m.category,
      domains:  m.domains ?? [],
      score:    +m.score.toFixed(3),
    })),
  });
});
