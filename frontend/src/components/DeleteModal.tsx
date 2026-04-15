import { useEffect } from "react";

type Props = {
  releaseName: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export default function DeleteModal({
  releaseName,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        className="modal"
      >
        <h2 id="delete-title" className="modal-title">
          Delete instance?
        </h2>
        <p className="modal-body">
          Delete{" "}
          <span className="font-mono text-ink">&quot;{releaseName}&quot;</span>?
          This removes the ArgoCD application and all associated resources. This
          cannot be undone.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
