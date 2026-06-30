"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",            label: "Dashboard",  icon: "⬡" },
  { href: "/accounts",    label: "Accounts",   icon: "◈" },
  { href: "/income",      label: "Income",     icon: "↑" },
  { href: "/templates",   label: "Templates",  icon: "◻" },
  { href: "/transfers",   label: "Transfers",  icon: "⇄" },
  { href: "/analytics",   label: "Analytics",  icon: "∿" },
  { href: "/categories",  label: "Categories", icon: "⬡" },
];

export function NavBar() {
  const path = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label, icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              "hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium " +
              "rounded-md transition-all duration-200 sweep-hover " +
              (active
                ? "text-violet-300 bg-violet-900/30 border border-violet-500/30 shadow-[0_0_10px_rgba(124,58,237,.3)]"
                : "text-[#9381c4] hover:text-violet-300 hover:bg-violet-900/20 border border-transparent")
            }
          >
            <span className="font-mono text-xs opacity-60">{icon}</span>
            {label}
          </Link>
        );
      })}

      {/* Mobile: icon-only bottom nav rendered elsewhere; here show label for active */}
      <div className="md:hidden flex items-center gap-1">
        {links.slice(0, 4).map(({ href, label, icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={
                "flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all " +
                (active
                  ? "text-violet-300 bg-violet-900/30 border border-violet-500/30"
                  : "text-[#9381c4]")
              }
              title={label}
            >
              <span className="font-mono">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
