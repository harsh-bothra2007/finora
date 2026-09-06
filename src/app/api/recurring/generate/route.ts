import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecurringTransactions } from "@/lib/supabase/queries";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await generateRecurringTransactions(user.id);
    return NextResponse.json({ generated: count });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
