import { requireOnboarding } from "@/lib/auth";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarding();
  return <>{children}</>;
}
