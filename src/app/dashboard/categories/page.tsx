import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CategoriesClient from "@/components/CategoriesClient";
import type { Category } from "@/lib/types/database";

export default async function CategoriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Categories
          </h1>
          <p className="mt-1 text-slate-600">
            Manage your income and expense categories.
          </p>
        </div>

        <CategoriesClient initialCategories={(categories as Category[]) ?? []} userId={user.id} />
      </div>
    </main>
  );
}
