/**
 * Today — real items + calm intelligence surface.
 *
 * Primary: tasks, reminders, events with quick-add
 * Secondary: AI intelligence insights
 */

import PageShell from "@/components/PageShell";
import TodayItemsList from "@/components/today/TodayItemsList";
import TodayIntelligenceSurface from "@/components/today/TodayIntelligenceSurface";
import { getProfileFirstName, requireOnboarding } from "@/lib/auth";

export default async function TodayPage() {
  const profile = await requireOnboarding();
  const firstName = getProfileFirstName(profile);

  return (
    <PageShell>
      <TodayItemsList userName={firstName} />
      <div style={{ marginTop: 20 }}>
        <TodayIntelligenceSurface userName={firstName} />
      </div>
    </PageShell>
  );
}
