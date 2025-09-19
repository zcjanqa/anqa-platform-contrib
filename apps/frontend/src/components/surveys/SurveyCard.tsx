// apps/frontend/src/components/surveys/SurveyCard.tsx
import Link from "next/link";
import AnqaPrettyOutlineButton from "@/components/anqa_pretty_outline_button";

export type SurveyCardProps = {
  label: string;
  title: string;
  description: string;
  href: string;
  outlined?: boolean;
};

export function SurveyCard({ label, title, description, href, outlined = true }: SurveyCardProps) {
  return (
    <Link
      href={href}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-3xl transition-transform hover:-translate-y-0.5"
    >
      {outlined ? (
        <div className="rounded-3xl p-[1px] bg-gradient-to-br from-slate-200/70 via-sky-200/60 to-slate-200/70 transition-colors group-hover:from-sky-300/70 group-hover:via-sky-300/60 group-hover:to-sky-300/70">
          <div className="rounded-3xl p-8 transition-all bg-white shadow-xl">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </div>

            <div className="mt-6">
              <AnqaPrettyOutlineButton as="span">Open survey →</AnqaPrettyOutlineButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl p-8 transition-all bg-white shadow-xl ring-1 ring-slate-100">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          </div>

          <div className="mt-6">
            <AnqaPrettyOutlineButton as="span">Open survey →</AnqaPrettyOutlineButton>
          </div>
        </div>
      )}
    </Link>
  );
}

export default SurveyCard;

// Variant replicating the previous disabled "More surveys" look
export function SurveyCardComingSoon({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="rounded-3xl p-8 transition-all bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm hover:shadow-lg opacity-70">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-500">Additional surveys will appear here.</p>
    </div>
  );
}


