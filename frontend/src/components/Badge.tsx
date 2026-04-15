type BadgeKind = "health" | "sync";

const HEALTH_VARIANT: Record<string, string> = {
  Healthy: "badge-healthy",
  Degraded: "badge-danger",
  Missing: "badge-danger",
  Progressing: "badge-warn",
  Suspended: "badge-neutral",
  Unknown: "badge-neutral",
};

const SYNC_VARIANT: Record<string, string> = {
  Synced: "badge-info",
  OutOfSync: "badge-warn",
  Unknown: "badge-neutral",
};

type Props = {
  kind: BadgeKind;
  status: string | null | undefined;
};

export default function Badge({ kind, status }: Props) {
  const label = status || "Unknown";
  const variant =
    kind === "health"
      ? (HEALTH_VARIANT[label] ?? "badge-neutral")
      : (SYNC_VARIANT[label] ?? "badge-neutral");

  return (
    <span className={`badge ${variant}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}
