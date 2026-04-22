/**
 * Visual indicator for the JS bundle deploy state on the live custom domain.
 * Two surfaces:
 *   - Compact <Badge /> (sidebar bottom bar)
 *   - Full-width <Banner /> (above the preview, only when "pending"/"error")
 */

import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeployStatus } from "@/hooks/useDeployStatus";

interface I18nLabels {
  title: string;
  synced: string;
  pending: string;
  error: string;
  checking: string;
  idle: string;
  bannerPendingTitle: string;
  bannerPendingBody: string;
  bannerErrorTitle: string;
  bannerErrorBody: string;
  recheck: string;
}

interface BadgeProps {
  status: DeployStatus;
  labels: I18nLabels;
  onCheck: () => void;
  liveHost: string | null;
}

export function DeployStatusBadge({ status, labels, onCheck, liveHost }: BadgeProps) {
  const config: Record<DeployStatus, { Icon: typeof Cloud; tone: string; text: string }> = {
    idle: { Icon: Cloud, tone: "text-muted-foreground border-border", text: labels.idle },
    checking: { Icon: Loader2, tone: "text-muted-foreground border-border", text: labels.checking },
    synced: { Icon: CheckCircle2, tone: "text-emerald-600 border-emerald-500/40 bg-emerald-500/5", text: labels.synced },
    pending: { Icon: Loader2, tone: "text-amber-600 border-amber-500/40 bg-amber-500/5", text: labels.pending },
    error: { Icon: AlertCircle, tone: "text-destructive border-destructive/40 bg-destructive/5", text: labels.error },
  };
  const { Icon, tone, text } = config[status];
  const spinning = status === "checking" || status === "pending";

  return (
    <button
      type="button"
      onClick={onCheck}
      disabled={!liveHost}
      title={`${labels.title}: ${text}${liveHost ? ` — ${labels.recheck}` : ""}`}
      className={cn(
        "flex items-center gap-1 px-2 h-6 rounded-md border text-[10px] font-medium transition-colors",
        "hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed",
        tone,
      )}
    >
      <Icon className={cn("h-3 w-3", spinning && "animate-spin")} />
      <span className="truncate max-w-[120px]">{text}</span>
    </button>
  );
}

interface BannerProps {
  status: DeployStatus;
  labels: I18nLabels;
  onCheck: () => void;
  liveHost: string | null;
}

export function DeployStatusBanner({ status, labels, onCheck, liveHost }: BannerProps) {
  if (status !== "pending" && status !== "error") return null;
  const isPending = status === "pending";
  const Icon = isPending ? Loader2 : AlertCircle;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 border-b text-xs",
        isPending
          ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
          : "bg-destructive/10 border-destructive/30 text-destructive",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", isPending && "animate-spin")} />
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          {isPending ? labels.bannerPendingTitle : labels.bannerErrorTitle}
        </p>
        <p className="opacity-80 leading-snug">
          {isPending ? labels.bannerPendingBody : labels.bannerErrorBody}
          {liveHost ? ` (${liveHost})` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onCheck}
        className="flex items-center gap-1 px-2 h-7 rounded-md border border-current/30 hover:bg-current/10 transition-colors text-[11px] font-medium shrink-0"
      >
        <RefreshCw className="h-3 w-3" />
        {labels.recheck}
      </button>
    </div>
  );
}
