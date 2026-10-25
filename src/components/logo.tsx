import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-6", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <path
        d="M6 10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10Z"
        className="stroke-background"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M6.5 9.5 16 17l9.5-7.5"
        className="stroke-background"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 19h3l1.6-3 2 5.5 1.6-3.5h2.3l1.5-2 1.5 2H24"
        stroke="#22c55e"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
