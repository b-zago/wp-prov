import os
from threading import Lock

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from kubernetes.client.exceptions import ApiException

import dev_store
from argocd import (
    application_exists,
    build_application_manifest,
    create_argocd_application,
    delete_argocd_application,
    ensure_namespace,
    get_argocd_client,
    get_instance_count,
    get_next_sftp_port,
    list_fleet_instances,
)
from config import DEV_MODE, MAX_INSTANCES, SUBDOMAIN_DOMAIN, TARGET_NAMESPACE
from models import DeployRequest

app = FastAPI()
port_lock = Lock()

if DEV_MODE:
    dev_store.seed_if_empty()


@app.on_event("startup")
def _ensure_target_namespace_on_startup():
    if DEV_MODE:
        return
    ensure_namespace(TARGET_NAMESPACE)


# --- Routes ---------------------------------------------------------------

@app.get("/api")
def read_root():
    return {"message": "Hello, World!"}


@app.post("/api/deploy")
def deploy(req: DeployRequest):
    full_url = f"https://{req.subdomain}.{SUBDOMAIN_DOMAIN}"

    if DEV_MODE:
        try:
            port = dev_store.create(req.releaseName, full_url)
        except dev_store.DevStoreError as e:
            raise HTTPException(status_code=e.status_code, detail=str(e))
        return {
            "message": "WordPress instance queued for deployment (dev mode)",
            "releaseName": req.releaseName,
            "namespace": TARGET_NAMESPACE,
            "sftpPort": port,
        }

    argocd_api = get_argocd_client()

    if application_exists(argocd_api, req.releaseName):
        raise HTTPException(
            status_code=409, detail=f"Instance '{req.releaseName}' already exists."
        )

    with port_lock:
        if get_instance_count(argocd_api) >= MAX_INSTANCES:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Instance limit reached ({MAX_INSTANCES} max). "
                    "Delete an existing instance before creating a new one."
                ),
            )

        sftp_port = get_next_sftp_port(argocd_api)

        helm_values = {
            "url": full_url,
            "title": req.title,
            "wpMail": req.wpMail,
            "dbUser": req.dbUser,
            "dbPassword": req.dbPassword,
            "dbRootPassword": req.dbRootPassword,
            "wpUser": req.wpUser,
            "wpPassword": req.wpPassword,
            "sftpUser": req.sftpUser,
            "sftpPassword": req.sftpPassword,
            "sftpPort": sftp_port,
        }

        manifest = build_application_manifest(req.releaseName, helm_values)

        try:
            create_argocd_application(argocd_api, manifest)
        except ApiException as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create ArgoCD application: {e.reason}",
            )

    return {
        "message": "WordPress instance queued for deployment",
        "releaseName": req.releaseName,
        "namespace": TARGET_NAMESPACE,
        "sftpPort": sftp_port,
    }


@app.delete("/api/deploy/{release_name}")
def undeploy(release_name: str):
    if DEV_MODE:
        try:
            dev_store.delete(release_name)
        except dev_store.DevStoreError as e:
            raise HTTPException(status_code=e.status_code, detail=str(e))
        return {"message": f"Instance '{release_name}' deleted."}

    argocd_api = get_argocd_client()

    if not application_exists(argocd_api, release_name):
        raise HTTPException(
            status_code=404, detail=f"Instance '{release_name}' not found."
        )

    try:
        delete_argocd_application(argocd_api, release_name)
    except ApiException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete ArgoCD application: {e.reason}",
        )

    return {"message": f"Instance '{release_name}' deleted."}


@app.get("/api/instances")
def list_instances():
    if DEV_MODE:
        return {"instances": dev_store.snapshot(), "limit": MAX_INSTANCES}

    argocd_api = get_argocd_client()

    try:
        instances = list_fleet_instances(argocd_api)
    except ApiException as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list instances: {e.reason}"
        )

    return {"instances": instances, "limit": MAX_INSTANCES}


# --- Static frontend ------------------------------------------------------

FRONTEND_DIST = "frontend/dist"
# Create the directory if missing so StaticFiles doesn't fail at import time.
# Actual files are served per-request, so running `npm run build` later
# "just works" without needing to restart uvicorn.
os.makedirs(FRONTEND_DIST, exist_ok=True)
app.mount(
    "/",
    StaticFiles(directory=FRONTEND_DIST, html=True, check_dir=False),
    name="static",
)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
