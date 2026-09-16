import Image from "next/image";
import { cn } from "@/lib/utils";

// Wordmark cropped from the official logo (public/logo-quesalon.png).
// Single flat indigo on transparent bg, so dark mode just turns it white.
export function QuesalonLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-quesalon.png"
      alt="Quesalon"
      width={916}
      height={198}
      priority
      className={cn("w-auto dark:brightness-0 dark:invert", className)}
    />
  );
}
