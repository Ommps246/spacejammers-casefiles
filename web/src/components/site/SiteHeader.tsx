// Top bar (Landing-Desktop / Landing-Mobile). On phones the links open in MobileMenu.
import Link from "next/link";

import { LogoMark } from "../ui/Logo";

import { MobileMenu } from "./MobileMenu";

type NavLink = { href: string; label: string };

// Method is docs/METHODS.md rendered at /methods, with things to try.
const LINKS: readonly NavLink[] = [
  { href: "/#cases", label: "Cases" },
  { href: "/methods", label: "Method" },
  { href: "/satellites", label: "Satellites" },
  { href: "/team", label: "Team" },
];

export function SiteHeader({ active = "Cases" }: { active?: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/6 px-5 lg:h-16 lg:px-20">
      <Link href="/" className="flex items-center gap-2.5 text-label">
        <span className="lg:hidden">
          <LogoMark size={20} />
        </span>
        <span className="hidden lg:block">
          <LogoMark size={28} />
        </span>
        <span className="text-[16px] font-[650] tracking-[-0.02em]">Case Files</span>
      </Link>

      <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
        {LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`inline-flex min-h-11 items-center text-[14px] font-medium ${
              link.label === active ? "text-label" : "text-secondary hover:text-label"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <span className="rounded-full border border-hairline px-3 py-1.5 text-[12px] font-semibold text-secondary">
          NASA Space Apps 2026
        </span>
      </nav>

      <MobileMenu links={LINKS} active={active} />
    </header>
  );
}
