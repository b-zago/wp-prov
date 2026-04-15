import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import InstancesView from "./InstancesView";
import DeployView from "./DeployView";
import {
  deleteInstance,
  deployInstance,
  fetchInstances,
  pingApi,
} from "../lib/api";
import type {
  ApiStatus,
  DeployPayload,
  Instance,
  ViewName,
} from "../lib/types";

export default function App() {
  const [view, setView] = useState<ViewName>("instances");

  const [instances, setInstances] = useState<Instance[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [apiStatus, setApiStatus] = useState<ApiStatus>("unknown");

  const total = instances.length;
  const atLimit = limit !== null && total >= limit;

  const loadInstances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInstances();
      setInstances(data.instances ?? []);
      setLimit(data.limit ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkApi = useCallback(async () => {
    const ok = await pingApi();
    setApiStatus(ok ? "ok" : "err");
  }, []);

  useEffect(() => {
    void checkApi();
    void loadInstances();
  }, [checkApi, loadInstances]);

  // Redirect away from deploy view if we become at-limit
  useEffect(() => {
    if (atLimit && view === "deploy") {
      // keep user on deploy so they see the banner; nothing to do
    }
  }, [atLimit, view]);

  const handleDeploy = useCallback(
    async (payload: DeployPayload) => {
      const res = await deployInstance(payload);
      await loadInstances();
      return res;
    },
    [loadInstances],
  );

  const handleDelete = useCallback(
    async (name: string) => {
      await deleteInstance(name);
      await loadInstances();
    },
    [loadInstances],
  );

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onNavigate={setView}
        apiStatus={apiStatus}
        deployDisabled={atLimit}
        deployDisabledReason={
          atLimit
            ? `Instance limit reached (${limit} max). Delete an instance first.`
            : undefined
        }
      />
      <main className="app-main">
        <div className="app-main-inner">
          {view === "instances" ? (
            <InstancesView
              instances={instances}
              loading={loading}
              error={error}
              limit={limit}
              onRefresh={loadInstances}
              onDelete={handleDelete}
            />
          ) : (
            <DeployView
              atLimit={atLimit}
              limit={limit}
              count={total}
              onDeploy={handleDeploy}
            />
          )}
        </div>
      </main>
    </div>
  );
}
