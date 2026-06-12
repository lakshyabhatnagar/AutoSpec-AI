import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="AutoSpec AI"
      className={cn("h-8 w-8", className)}
      fill="none"
    >
      <path
        d="M13 48L25 13H43V25H29L21 48H13Z"
        fill="#F4F6F8"
      />
      <path
        d="M27 43C35 37 45 36 54 40"
        stroke="#F4F6F8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M45 13L55 23H45V13Z"
        fill="#0EA5B7"
      />
      <path
        d="M20 50H50"
        stroke="#0EA5B7"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="54" cy="50" r="5" stroke="#0EA5B7" strokeWidth="4" />
    </svg>
  );
}

export function BrandAppIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-[1.15rem] bg-[#0B1220] shadow-[0_14px_40px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10",
        className
      )}
    >
      <BrandMark className="h-7 w-7" />
    </span>
  );
}
