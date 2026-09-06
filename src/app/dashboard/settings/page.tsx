import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/supabase/queries";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // If no profile yet (e.g. Google user created before migration 004),
  // create an empty one so the form has something to edit.
  const profileData = profile ?? {
    id: user.id,
    name: user.user_metadata?.name ?? "",
    username: user.user_metadata?.username ?? "",
    role: (user.user_metadata?.role as "student" | "employee" | "employer") ?? "student",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Passwords can't be read back, so start blank.
  return (
    <SettingsForm
      userId={user.id}
      initialProfile={profileData}
      initialEmail={user.email ?? ""}
      providers={user.app_metadata?.providers ?? []}
    />
  );
}
