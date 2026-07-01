import { cn } from "@/lib/utils";

export const Card = ({ className, children, as: Tag = "div", ...rest }) => (
  <Tag
    className={cn(
      "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",
      className,
    )}
    {...rest}
  >
    {children}
  </Tag>
);

export const CardHeader = ({ className, children }) => (
  <div className={cn("px-6 pt-6", className)}>{children}</div>
);

export const CardBody = ({ className, children }) => (
  <div className={cn("px-6 py-6", className)}>{children}</div>
);
