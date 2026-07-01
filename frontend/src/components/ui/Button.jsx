import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-white/80",
  secondary:
    "bg-white text-slate-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  accent:
    "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
};

const sizes = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition disabled:cursor-not-allowed",
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  >
    {children}
  </button>
);