import { requireOnboarding } from "@/lib/auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarding();
  return <>{children}</>;
}
