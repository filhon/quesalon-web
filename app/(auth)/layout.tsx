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
      className={`${syne.variable} min-h-screen bg-background flex items-center justify-center p-4 auth-bg-gradient`}
    >
      {children}
    </div>
  );
}
