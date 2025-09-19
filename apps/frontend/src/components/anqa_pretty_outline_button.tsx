// apps/frontend/src/components/anqa_pretty_outline_button.tsx
// Gradient-outline pill button used across the app
import type { ReactNode, ButtonHTMLAttributes } from "react";

type Props = {
  children: ReactNode;
  as?: "button" | "span" | "div";
  innerClassName?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function AnqaPrettyOutlineButton({ children, as = "button", innerClassName = "", ...rest }: Props) {
  const Inner = (
    <span className={[
      "inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-800 transition-colors",
      "group-hover:bg-transparent group-hover:text-white",
      innerClassName,
    ].join(" ")}>{children}</span>
  );

  const WrapperClass = "inline-flex rounded-full p-[1px] bg-gradient-to-r from-indigo-600 via-sky-500 to-sky-400 transition-shadow group hover:shadow";

  if (as === "button") {
    return (
      <button {...rest} className={[WrapperClass, rest.className || ""].join(" ")}> 
        {Inner}
      </button>
    );
  }
  if (as === "div") {
    return <div className={WrapperClass}>{Inner}</div>;
  }
  return <span className={WrapperClass}>{Inner}</span>;
}


