import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const searchParams = await props.searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Starfield already rendered via body::before in globals.css */}
      <div className="relative w-full max-w-sm">
        {/* Outer glow ring */}
        <div
          className="absolute -inset-1 rounded-2xl opacity-40"
          style={{ background: "linear-gradient(135deg,#7c3aed,#22d3ee,#f472b6)", filter: "blur(16px)" }}
          aria-hidden="true"
        />
        <div className="relative rounded-2xl bg-[#0d0b1e] border border-violet-500/30 p-8 shadow-2xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold glitch gradient-text">SpendWise</h1>
            <p className="mt-2 text-sm font-mono text-[#9381c4]">ALIEN FINANCE · SECURE ACCESS</p>
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("credentials", {
                password: formData.get("password"),
                redirectTo: "/",
              });
            }}
          >
            <div className="space-y-4">
              {searchParams.error && (
                <p className="text-sm text-rose-400 font-mono text-center">
                  ⚠ INVALID CREDENTIALS
                </p>
              )}
              <div>
                <label className="block text-xs font-mono text-[#9381c4] uppercase tracking-widest mb-2">
                  Access Code
                </label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  required
                  autoFocus
                  className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4] focus:border-violet-400 focus:ring-1 focus:ring-violet-500/50"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg bg-violet-700 hover:bg-violet-600 text-white font-semibold text-sm transition-all duration-200 sweep-hover"
                style={{ boxShadow: "0 0 16px rgba(124,58,237,.5), 0 0 32px rgba(124,58,237,.2)" }}
              >
                AUTHENTICATE
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs font-mono text-[#9381c4]">
            SpendWise — Track every rupee
          </p>
        </div>
      </div>
    </div>
  );
}
