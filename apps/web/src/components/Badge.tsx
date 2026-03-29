type BadgeVariant = "seated" | "available" | "reserved" | "turning" | "blocked" | "success" | "accent";

const styles: Record<BadgeVariant, string> = {
  seated:    "bg-[#EAF0EA] text-[#2C4A2E] border border-[rgba(44,74,46,0.3)]",
  available: "bg-[#F0F7F0] text-[#4A7A4C] border border-[rgba(74,122,76,0.2)]",
  reserved:  "bg-[#FBF4E3] text-[#B8962E] border border-[rgba(184,150,46,0.3)]",
  turning:   "bg-[#FEF3C7] text-[#D97706] border border-[rgba(217,119,6,0.3)]",
  blocked:   "bg-[#F3F4F6] text-[#6B7280] border border-[rgba(107,114,128,0.2)]",
  success:   "bg-[#EAF0EA] text-[#2C4A2E] border border-[rgba(44,74,46,0.3)]",
  accent:    "bg-[#F5E9C4] text-[#B8962E] border border-[rgba(184,150,46,0.3)]",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = "available", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] rounded-[4px] ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
