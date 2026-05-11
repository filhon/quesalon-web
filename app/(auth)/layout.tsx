import { Syne } from "next/font/google";
import type { ReactNode } from "react";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${syne.variable} min-h-screen bg-zinc-950 flex items-center justify-center p-4`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 0%, oklch(0.18 0 0) 0%, transparent 60%),
          linear-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px),
          linear-gradient(90deg, oklch(1 0 0 / 3%) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 40px 40px, 40px 40px",
      }}
    >
      {children}
    </div>
  );
}
