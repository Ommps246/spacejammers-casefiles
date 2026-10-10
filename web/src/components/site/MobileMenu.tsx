"use client";
// Phone menu. A solid panel (not frosted glass) over a dimmed page, so the links never mix with the page
// text behind them. Closes on a link tap, a tap outside, or Escape; the button turns into a close (×).
import Link from "next/link";
import { useEffect, useState } from "react";

type NavLink = { href: string; label: string };

export function MobileMenu({ links, active }: { links: readonly NavLink[]; active: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="relative z-50 flex size-11 items-center justify-center text-label"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          {open ? (
            <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
            <path d="M3 7 H17 M3 13 H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="menu-fade fixed inset-0 z-40 cursor-default bg-space-0/75 backdrop-blur-sm"
          />
          <nav
            id="mobile-menu"
            aria-label="Main"
            className="menu-drop fixed top-14 right-3 left-3 z-50 flex flex-col rounded-card border border-white/12 bg-space-1 p-2 shadow-[0_24px_60px_rgb(0_0_0/0.6)]"
          >
            {links.map((link) => {
              const on = link.label === active;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-12 items-center justify-between rounded-tile px-4 text-[17px] font-semibold tracking-[-0.01em] ${
                    on ? "bg-gold/15 text-gold-pale" : "text-label active:bg-white/8"
                  }`}
                >
                  {link.label}
                  <span aria-hidden="true" className={on ? "text-gold" : "text-tertiary"}>
                    →
                  </span>
                </Link>
              );
            })}
            <span className="meta px-4 pt-3 pb-2 text-tertiary">NASA Space Apps 2026 · SpaceJammers</span>
          </nav>
        </>
      )}
    </div>
  );
}
