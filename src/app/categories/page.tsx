import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCategoriesWithSubs } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/nav-bar";
import { CategoryManager } from "@/components/category-manager";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const categories = await getCategoriesWithSubs();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Expense Tracker</h1>
            <NavBar />
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Create, rename, and organize categories and subcategories.
          </p>
        </div>

        <CategoryManager categories={categories} />
      </main>
    </div>
  );
}
