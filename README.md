# WP Fleet Provisioner

Small FastAPI service + Astro/React UI for provisioning WordPress instances
through ArgoCD. The backend creates one ArgoCD `Application` per release
from a Helm chart in an external infra repo; the UI lists and manages them.

## Layout

- `main.py` — FastAPI app, routes, static mount.
- `config.py` — env-driven configuration.
- `models.py` — pydantic request models.
- `argocd.py` — ArgoCD/Kubernetes helpers (manifest build, CRUD, port scan,
  namespace bootstrap).
- `dev_store.py` — in-memory fake store for running the UI without a cluster.
- `frontend/` — Astro + React + Tailwind frontend.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PROD_DEPLOY` | `1` | Selects the target namespace. `1` (or any non-`0` value) deploys to `wp-instances-prod`. Set to `0` to deploy to `wp-instances-stage` instead. The target namespace is auto-created on startup if missing. |
| `MAX_WORDPRESS_INSTANCES` | `2` | Hard cap on the number of live fleet-labelled ArgoCD apps. New deploys are rejected with 409 once the cap is hit. |
| `WP_PROV_DEV` | *(unset)* | When set to `1`/`true`/`yes`/`on`, the API skips Kubernetes entirely and serves a pre-seeded in-memory store — handy for frontend work. Any other value (or unset) hits the real cluster. |

## Running locally (dev mode, no cluster)

```sh
docker compose up
```

`docker-compose.yml` sets `WP_PROV_DEV=1`, so the backend uses the fake
store. The UI is served at http://localhost:8000 and Astro dev at
http://localhost:4321.

## Running against a real cluster

Deploy the prod image inside the cluster with a ServiceAccount that has
permission to manage ArgoCD `Applications` in the `argocd` namespace and
to create namespaces. The service assumes in-cluster config
(`load_incluster_config`).
