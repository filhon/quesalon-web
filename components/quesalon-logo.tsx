import type { SVGProps } from "react";

export function QuesalonLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="50" cy="48" r="30" stroke="currentColor" strokeWidth="11" />
      <line
        x1="66"
        y1="64"
        x2="82"
        y2="80"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
    </svg>
  );
}
