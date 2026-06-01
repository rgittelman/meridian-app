/**
 * Today — the emotional + contextual anchor of the app.
 *
 * DailyBriefing + date-grouped items + momentum feedback.
 * Intelligence is now integrated directly into the briefing header.
 */

import PageShell from "@/components/PageShell";
import TodayItemsList from "@/components/today/TodayItemsList";
import { getProfileFirstName, requireOnboarding } from "@/lib/auth";

export default async function TodayPage() {
  const profile = await requireOnboarding();
  const firstName = getProfileFirstName(profile);

  return (
    <PageShell>
      <TodayItemsList userName={firstName} />
    </PageShell>
  );
}
