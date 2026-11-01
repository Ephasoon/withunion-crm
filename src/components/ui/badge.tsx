import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
        secondary: "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        destructive: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        success: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        info: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        outline: "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400",
        lead: "border-transparent bg-indigo-100 text-indigo-700",
        qualified: "border-transparent bg-purple-100 text-purple-700",
        meeting: "border-transparent bg-pink-100 text-pink-700",
        proposal: "border-transparent bg-amber-100 text-amber-700",
        negotiation: "border-transparent bg-orange-100 text-orange-700",
        won: "border-transparent bg-emerald-100 text-emerald-700",
        project: "border-transparent bg-cyan-100 text-cyan-700",
        support: "border-transparent bg-slate-100 text-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
