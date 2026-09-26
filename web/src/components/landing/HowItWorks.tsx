// "How a case works · Built to argue with itself": the five parts of every case file, and a link to the
// full method (docs/METHODS.md, rendered at /methods).
import Link from "next/link";

const STEPS = [
  { title: "Question", body: "One plain question about a place." },
  { title: "Evidence", body: "NASA satellite and climate data, tested." },
  { title: "Other suspects", body: "What else could explain it?" },
  { title: "Devil’s Advocate", body: "The strongest case against the finding." },
  { title: "Verdict", body: "An honest strength label." },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="flex scroll-mt-4 flex-col gap-5 px-5 py-16 lg:gap-9 lg:p-[120px]">
      <div className="flex flex-col gap-2.5">
        <span className="meta text-gold">How a case works</span>
        <h2 className="m-0 text-[26px] leading-[1.15] font-bold tracking-[-0.025em] lg:text-[32px]">
          Built to argue with itself
        </h2>
      </div>
      <ol className="m-0 flex list-none flex-col p-0 lg:flex-row lg:gap-6">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className={`flex gap-3.5 border-t py-3.5 lg:flex-1 lg:basis-0 lg:flex-col lg:gap-2 lg:pt-4 lg:pb-0 ${
              i === 0 ? "border-white/9 lg:border-gold/55" : "border-white/9"
            }`}
          >
            <span className="meta pt-1 text-gold normal-case lg:pt-0">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex flex-col gap-1 lg:gap-2">
              <span className="text-[16px] font-semibold lg:text-[17px] lg:tracking-[-0.01em]">{step.title}</span>
              <span className="text-[14px] leading-normal text-secondary lg:leading-[1.55]">{step.body}</span>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/methods" className="self-start text-[14px] font-semibold text-gold-soft hover:text-gold-pale">
        Method: every statistical choice, explained →
      </Link>
    </section>
  );
}
