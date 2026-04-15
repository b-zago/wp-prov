import { useState } from "react";
import type { Instance } from "../lib/types";
import Badge from "./Badge";
import DeleteModal from "./DeleteModal";
import { ExternalIcon, RefreshIcon, TrashIcon } from "./icons";

type Props = {
  instances: Instance[];
  loading: boolean;
  error: string | null;
  limit: number | null;
  onRefresh: () => void;
  onDelete: (name: string) => Promise<void>;
};

export default function InstancesView({
  instances,
  loading,
  error,
  limit,
  onRefresh,
  onDelete,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const total = instances.length;
  const healthy = instances.filter((i) => i.healthStatus === "Healthy").length;
  const synced = instances.filter((i) => i.syncStatus === "Synced").length;
  const degraded = instances.filter(
    (i) => i.healthStatus === "Degraded" || i.healthStatus === "Missing",
  ).length;

  const atLimit = limit !== null && total >= limit;
  const capacityLabel =
    limit !== null ? `${total} / ${limit}` : String(total);
  const capacityClass = atLimit
    ? "is-danger"
    : limit !== null && total >= limit * 0.8
      ? "is-warn"
      : "";

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      await onDelete(pendingDelete);
      setPendingDelete(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1 className="page-title">Instances</h1>
          <p className="page-subtitle">All running WordPress deployments</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
        >
          <RefreshIcon size={15} className={loading ? "spinner" : ""} />
          Refresh
        </button>
      </header>

      <div className="stats-grid">
        <StatCard label="Total" value={loading ? "—" : total} />
        <StatCard
          label="Healthy"
          value={loading ? "—" : healthy}
          modifier="is-success"
        />
        <StatCard label="Synced" value={loading ? "—" : synced} />
        <StatCard
          label="Degraded"
          value={loading ? "—" : degraded}
          modifier="is-danger"
        />
        <StatCard
          label="Capacity"
          value={loading ? "—" : capacityLabel}
          modifier={capacityClass}
        />
      </div>

      <div className="table-wrap">
        <table className="instance-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>SFTP Port</th>
              <th>Health</th>
              <th>Sync</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {loading && instances.length === 0 ? (
              <tr className="placeholder-row">
                <td colSpan={6}>Loading instances…</td>
              </tr>
            ) : error ? (
              <tr className="placeholder-row">
                <td colSpan={6}>Failed to load: {error}</td>
              </tr>
            ) : instances.length === 0 ? (
              <tr className="placeholder-row">
                <td colSpan={6}>No instances deployed yet.</td>
              </tr>
            ) : (
              instances.map((inst) => (
                <tr key={inst.releaseName}>
                  <td className="name-cell">{inst.releaseName}</td>
                  <td>
                    {inst.url ? (
                      <a
                        href={inst.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="url-link inline-flex items-center gap-1.5"
                      >
                        {inst.url}
                        <ExternalIcon size={12} />
                      </a>
                    ) : (
                      <span className="text-ink-dim">—</span>
                    )}
                  </td>
                  <td className="mono">{inst.sftpPort ?? "—"}</td>
                  <td>
                    <Badge kind="health" status={inst.healthStatus} />
                  </td>
                  <td>
                    <Badge kind="sync" status={inst.syncStatus} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-icon-danger"
                      title="Delete instance"
                      onClick={() => setPendingDelete(inst.releaseName)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pendingDelete && (
        <DeleteModal
          releaseName={pendingDelete}
          busy={deleteBusy}
          onCancel={() => (deleteBusy ? undefined : setPendingDelete(null))}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  modifier,
}: {
  label: string;
  value: string | number;
  modifier?: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${modifier ?? ""}`.trim()}>{value}</span>
    </div>
  );
}
