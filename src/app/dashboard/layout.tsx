import DashboardShell from "@/components/DashboardShell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userName: string | undefined;
  let userEmail: string | undefined;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      userName =
        (data.user.user_metadata?.username as string) ||
        (data.user.user_metadata?.name as string) ||
        data.user.email?.split("@")[0] ||
        "User";
      userEmail = data.user.email ?? undefined;
    }
  } catch {
    // Not signed in — Sidebar falls back to defaults.
  }

  return (
    <DashboardShell userName={userName} userEmail={userEmail}>
      {children}
    </DashboardShell>
  );
}