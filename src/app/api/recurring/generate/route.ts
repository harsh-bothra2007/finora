import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecurringTransactions } from "@/lib/supabase/queries";
import { generateAllRecurringTransactions } from "@/lib/supabase/admin";

async function handleGenerate(request: Request) {
  // Vercel Cron sends GET requests and attaches
  // `Authorization: Bearer $CRON_SECRET` when the CRON_SECRET
  // environment variable is configured on the project.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured. Set it in the deployment environment so the cron can generate transactions for all users.",
        },
        { status: 500 }
      );
    }

    try {
      const generated = await generateAllRecurringTransactions();
      return NextResponse.json({ generated });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to generate transactions";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Manual trigger from the browser ("Generate Now") — requires a session
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

export async function GET(request: Request) {
  return handleGenerate(request);
}

export async function POST(request: Request) {
  return handleGenerate(request);
}