// DEMO-ONLY — delete this file to remove the demo account feature
// (see src/lib/demo.ts for removal instructions)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_USERNAME,
  seedDemoData,
} from "@/lib/demo";

export async function POST() {
  const admin = createAdminClient();

  // Without SUPABASE_SERVICE_ROLE_KEY the demo user can't be created, but if
  // it already exists (from a previous run) the client-side sign-in below will
  // still work. Only account creation/seeding needs the privileged key, so we
  // skip setup and let the login page attempt to sign in.
  if (admin) {
    try {
      // Ensure the demo user exists, creating + seeding it on first use
      const { data, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) throw listError;

      const demoUser = data.users.find((u) => u.email === DEMO_EMAIL);

      if (!demoUser) {
        const { data: created, error: createError } =
          await admin.auth.admin.createUser({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
            email_confirm: true,
            user_metadata: {
              name: "Demo User",
              username: DEMO_USERNAME,
            },
          });
        if (createError) throw createError;

        await seedDemoData(admin, created.user.id);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to set up the demo account";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, adminSetup: !!admin });
}