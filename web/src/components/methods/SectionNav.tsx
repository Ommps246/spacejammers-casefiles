"use client";
// "On this page" for /methods: a side rail on wide screens, a sticky scrolling strip on phones.
// The current section is highlighted as you scroll (IntersectionObserver; no scroll listener).
import { useEffect, useRef, useState } from "react";

export type NavItem = { id: string; label: string; demo?: boolean };

export function SectionNav({ items }: { items: NavItem[] }) {
  const [current, setCurrent] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const first = items.find((item) => seen.get(item.id));
        if (first) setCurrent(first.id);
      },
      { rootMargin: "-15% 0px -55% 0px" },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  // On phones the strip scrolls sideways: keep the current chip in view without moving the page.
  const strip = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = strip.current;
    const chip = list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!list || !chip || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: chip.offsetLeft - list.clientWidth / 2 + chip.offsetWidth / 2, behavior: "smooth" });
  }, [current]);

  return (
    <nav
      aria-label="On this page"
      className="sticky top-0 z-10 -mx-4 border-b border-hairline bg-space-0/85 px-4 backdrop-blur-xl lg:top-8 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
    >
      <span className="meta hidden pb-3 text-tertiary lg:block">On this page</span>
      <ol ref={strip} className="relative m-0 flex list-none gap-1.5 overflow-x-auto p-0 py-2 [scrollbar-width:none] lg:flex-col lg:gap-0.5 lg:py-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const on = item.id === current;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={on ? "location" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-[13px] font-medium whitespace-nowrap lg:min-h-9 lg:rounded-flag lg:border-l-2 lg:rounded-l-none ${
                  on
                    ? "bg-gold/15 text-gold-pale lg:border-gold lg:bg-transparent"
                    : "text-secondary hover:text-label lg:border-transparent"
                }`}
              >
                {item.label}
                {item.demo && <span className="size-1.5 rounded-full bg-gold" title="Has something to try" />}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
