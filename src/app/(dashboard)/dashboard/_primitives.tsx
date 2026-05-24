import { Card, CardContent } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faChartPie } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

export type Accent = "primary" | "gold" | "sky" | "emerald" | "violet" | "rose" | "amber";

const tints: Record<Accent, string> = {
  primary: "bg-primary/10 text-primary",
  gold: "bg-accent/15 text-accent-foreground dark:text-accent",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconDefinition;
  accent?: Accent;
}) {
  return (
    <Card className="group relative overflow-hidden border-primary/10 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
      {/* Subtle gold accent strip on hover (IT theme) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1 ring-inset ring-primary/10", tints[accent])}>
          <FontAwesomeIcon icon={icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </div>
          <div className="text-2xl font-bold leading-tight font-mono-tnum">{value}</div>
          {hint ? <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
        </div>
        {action}
      </div>
      <CardContent className="px-5 pb-5 pt-0">{children}</CardContent>
    </Card>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({ icon, message }: { icon?: IconDefinition; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
      {icon ? <FontAwesomeIcon icon={icon} className="h-5 w-5 opacity-50" /> : null}
      <p>{message}</p>
    </div>
  );
}

export function Greeting({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[.06] via-background to-accent/[.05] p-5">
      <div className="pointer-events-none absolute inset-0 bg-grid-dots opacity-50" />
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <FontAwesomeIcon icon={faChartPie} className="h-2.5 w-2.5" />
          Dashboard
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Halo, <span className="text-primary">{name.split(" ")[0]}</span>!
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
