import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  showTagline?: boolean;
}

/**
 * Logotipo da caetusOS.
 * "caetus" em mono + "OS" em destaque com cor primária.
 */
export function Brand({ className, showTagline = false }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/40">
        <span className="font-mono text-sm font-bold text-primary">{"//"}</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full bg-primary" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-tight">
          caetus<span className="text-primary">OS</span>
        </span>
        {showTagline && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            funcionários digitais
          </span>
        )}
      </div>
    </div>
  );
}
