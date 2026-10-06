"use client";
// "How a case works · Built to argue with itself": the five parts of every case file. Pick a step to see
// what the featured case actually says there (text and numbers from the case file and its narration).
import Link from "next/link";
import { useRef, useState } from "react";

import type { WalkStep } from "@/lib/case-cards";

import { StrengthLabel } from "../ui/StrengthLabel";

type Props = { steps: WalkStep[]; caseId: string };

export function HowItWorks({ steps, caseId }: Props) {
  const [current, setCurrent] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const step = steps[current];
  const isObjection = step.title.startsWith("Devil");

  const go = (i: number) => {
    const next = (i + steps.length) % steps.length;
    setCurrent(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="how" className="flex scroll-mt-4 flex-col gap-5 px-5 py-16 lg:gap-9 lg:p-[120px]">
      <div className="flex flex-col gap-2.5">
        <span className="meta text-gold">How a case works</span>
        <h2 className="m-0 text-[26px] leading-[1.15] font-bold tracking-[-0.025em] lg:text-[32px]">
          Built to argue with itself
        </h2>
        <p className="m-0 text-[15px] text-secondary">Pick a step to see what our featured case says there.</p>
      </div>

      <div role="tablist" aria-label="The five parts of a case" className="m-0 flex flex-col p-0 lg:flex-row lg:gap-6">
        {steps.map((s, i) => {
          const on = i === current;
          return (
            <button
              key={s.title}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`how-tab-${i}`}
              aria-selected={on}
              aria-controls="how-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setCurrent(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") go(i + 1);
                if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(i - 1);
              }}
              className={`flex cursor-pointer gap-3.5 border-t py-3.5 text-left transition-colors duration-200 lg:flex-1 lg:basis-0 lg:flex-col lg:gap-2 lg:border-t-2 lg:pt-4 lg:pb-0 ${
                on ? "border-gold" : "border-white/9 hover:border-white/30"
              }`}
            >
              <span className="meta pt-1 text-gold normal-case lg:pt-0">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex flex-col gap-1 lg:gap-2">
                <span className={`text-[16px] font-semibold lg:text-[17px] lg:tracking-[-0.01em] ${on ? "text-label" : "text-secondary"}`}>
                  {s.title}
                </span>
                <span className="text-[14px] leading-normal text-secondary lg:leading-[1.55]">{s.body}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="how-panel"
        role="tabpanel"
        aria-labelledby={`how-tab-${current}`}
        className={`${isObjection ? "objection-card" : "glass-card"} flex min-h-[176px] flex-col justify-center p-5 lg:p-7`}
      >
        {/* The key restarts the short rise-in each time the step changes. */}
        <div key={current} className="how-rise flex max-w-[760px] flex-col gap-2.5">
          {step.example ? (
            <>
              <span className={`meta ${isObjection ? "text-objection-soft" : "text-gold"}`}>{step.example.kicker}</span>
              <p className="m-0 text-[18px] leading-[1.5] tracking-[-0.01em] text-label lg:text-[20px]">{step.example.text}</p>
              {(step.example.stat || step.example.strength) && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {step.example.stat && <span className="font-mono text-[14px] text-secondary">{step.example.stat}</span>}
                  {step.example.strength && <StrengthLabel kind={step.example.strength} />}
                </div>
              )}
            </>
          ) : (
            <p className="m-0 text-[18px] leading-[1.5] text-label">{step.body}</p>
          )}
          <Link href={`/case/${caseId}`} className="self-start pt-1 text-[14px] font-semibold text-gold-soft hover:text-gold-pale">
            Open the full case →
          </Link>
        </div>
      </div>

      <Link href="/methods" className="self-start text-[14px] font-semibold text-gold-soft hover:text-gold-pale">
        Method: every statistical choice, explained →
      </Link>
      <Link href="/satellites" className="self-start text-[14px] font-semibold text-gold-soft hover:text-gold-pale">
        Meet the witnesses: NASA’s Terra and Aqua, in 3D →
      </Link>
    </section>
  );
}
