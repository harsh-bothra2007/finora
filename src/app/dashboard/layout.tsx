import DashboardShell from "@/components/DashboardShell";
import { MOCK_USER } from "@/lib/mock-data";

// UI-only build: the shell uses mock user data directly. When connecting to
// Supabase later, restore the server-side getUser() lookup here:
//   const supabase = await createClient();
//   const { data } = await supabase.auth.getUser();
//   ...and pass the real name/email to DashboardShell.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell userName={MOCK_USER.name} userEmail={MOCK_USER.email}>
      {children}
    </DashboardShell>
  );
}
