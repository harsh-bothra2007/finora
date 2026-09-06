import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getNextOccurrence } from "@/lib/supabase/queries";

let adminClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client authenticated with the service role key.
 * It bypasses RLS, which the daily cron needs in order to generate
 * recurring transactions for every user. Returns null when
 * SUPABASE_SERVICE_ROLE_KEY is not configured.
 *
 * Never import this module from a Client Component — it holds a
 * privileged credential.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  if (!adminClient) {
    adminClient = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

/**
 * Generate transactions from every active recurring template whose
 * next_date is due, across all users. Returns the number of
 * transactions created.
 */
export async function generateAllRecurringTransactions(): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) return 0;

  const today = new Date().toISOString().slice(0, 10);

  const { data: templates } = await supabase
    .from("recurring_templates")
    .select(
      "id, user_id, category_id, name, amount, type, payment_method, frequency, end_date, next_date, notes"
    )
    .eq("is_active", true)
    .lte("next_date", today);

  if (!templates || templates.length === 0) return 0;

  let count = 0;

  for (const template of templates) {
    // Skip templates that have passed their end_date and deactivate them
    if (template.end_date && template.next_date > template.end_date) {
      await supabase
        .from("recurring_templates")
        .update({ is_active: false })
        .eq("id", template.id);
      continue;
    }

    // Create the transaction
    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: template.user_id,
      category_id: template.category_id,
      name: template.name,
      amount: template.amount,
      type: template.type,
      payment_method: template.payment_method,
      date: template.next_date,
      notes: template.notes,
    });

    if (insertError) continue;
    count++;

    // Advance next_date for the next occurrence
    const newNextDate = getNextOccurrence(template.next_date, template.frequency);
    await supabase
      .from("recurring_templates")
      .update({ next_date: newNextDate })
      .eq("id", template.id);
  }

  return count;
}