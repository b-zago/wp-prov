import type { ApiStatus, ViewName } from "../lib/types";
import { GridIcon, PlusIcon } from "./icons";

type Props = {
  view: ViewName;
  onNavigate: (view: ViewName) => void;
  apiStatus: ApiStatus;
  deployDisabled: boolean;
  deployDisabledReason?: string;
};

export default function Sidebar({
  view,
  onNavigate,
  apiStatus,
  deployDisabled,
  deployDisabledReason,
}: Props) {
  const items: Array<{
    id: ViewName;
    label: string;
    icon: JSX.Element;
    disabled?: boolean;
    title?: string;
  }> = [
    {
      id: "instances",
      label: "Instances",
      icon: <GridIcon />,
    },
    {
      id: "deploy",
      label: "Deploy",
      icon: <PlusIcon />,
      disabled: deployDisabled,
      title: deployDisabled ? deployDisabledReason : undefined,
    },
  ];

  const statusText =
    apiStatus === "ok"
      ? "API online"
      : apiStatus === "err"
        ? "API unreachable"
        : "Connecting…";

  const statusClass =
    apiStatus === "ok"
      ? "status-dot is-ok"
      : apiStatus === "err"
        ? "status-dot is-err"
        : "status-dot";

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo" aria-hidden>
          w
        </div>
        <div className="flex flex-col leading-tight">
          <span className="sidebar-title">wp-prov</span>
          <span className="sidebar-title-dim">Provisioner</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={[
              "sidebar-nav-item",
              view === item.id ? "is-active" : "",
              item.disabled ? "is-disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={item.disabled}
            title={item.title}
            onClick={() => !item.disabled && onNavigate(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className={statusClass} aria-hidden />
        <span>{statusText}</span>
      </div>
    </aside>
  );
}
