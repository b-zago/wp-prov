import type {
  DeployPayload,
  DeployResponse,
  InstancesResponse,
} from "./types";

const API = "/api";

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string };
    return body?.detail ?? res.statusText;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function pingApi(): Promise<boolean> {
  try {
    const res = await fetch(API);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchInstances(): Promise<InstancesResponse> {
  const res = await fetch(`${API}/instances`);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InstancesResponse;
}

export async function deployInstance(
  payload: DeployPayload,
): Promise<DeployResponse> {
  const res = await fetch(`${API}/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as DeployResponse;
}

export async function deleteInstance(releaseName: string): Promise<void> {
  const res = await fetch(`${API}/deploy/${releaseName}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}
