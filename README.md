# WP Fleet Provisioner

A web app for provisioning and managing WordPress instances in a Kubernetes cluster via ArgoCD.

## How it works

- Deploy new WordPress instances by filling out a simple form
- Each deployment creates an ArgoCD `Application` from a Helm chart in the /b-zago/k3d-infra repo
- View all running instances with their live sync and health status from ArgoCD
- Delete instances directly from the UI
- Set `WP_PROV_DEV=1` to run in dev mode — no cluster needed, uses an in-memory fake store

## Stack

- **Frontend** — Astro + React + Tailwind CSS
- **Backend** — Python + FastAPI
- **Orchestration** — Kubernetes + ArgoCD + Helm

## Dev

```bash
docker compose up   # starts backend + frontend with hot-reload (dev mode, no cluster needed)
```

In production, the app runs inside the cluster using an in-cluster ServiceAccount with permissions to manage ArgoCD `Application` resources as well as `namespaces` and `ingresses`.
