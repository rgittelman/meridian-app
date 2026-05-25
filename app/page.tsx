/**
 * Today — calm intelligence surface.
 *
 * Data: GET /api/today/intelligence (client fetch with skeleton)
 * Auth: server-side guards; profile name passed to client greeting.
 */

import PageShell from "@/components/PageShell";
import PageHeader from "@/components/PageHeader";
import { TodayIcon } from "@/components/PageHeader";
import TodayIntelligenceSurface from "@/components/today/TodayIntelligenceSurface";
import { getProfileFirstName, requireOnboarding } from "@/lib/auth";

export default async function TodayPage() {
  const profile = await requireOnboarding();
  const firstName = getProfileFirstName(profile);

  return (
    <PageShell>
      <PageHeader
        icon={<TodayIcon />}
        title="Today"
        subtitle="Your day, at a glance."
        mb={16}
      />
      <TodayIntelligenceSurface userName={firstName} />
    </PageShell>
  );
}
