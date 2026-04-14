from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
from kubernetes import client, config
from kubernetes.client.exceptions import ApiException
from threading import Lock
import uvicorn
import re
import yaml
import os

app = FastAPI()
port_lock = Lock()

ARGOCD_NAMESPACE = "argocd"
GITHUB_REPO = "https://github.com/b-zago/k3d-infra"
CHART_PATH = "charts/wp-chart"
SFTP_PORT_START = 30022
MAX_INSTANCES = int(os.getenv("MAX_WORDPRESS_INSTANCES", "2"))


# --- Kubernetes client setup ---

def get_argocd_client() -> client.CustomObjectsApi:
    config.load_incluster_config()
    return client.CustomObjectsApi()


# --- Port assignment ---

def get_used_sftp_ports(argocd_api: client.CustomObjectsApi) -> set[int]:
    try:
        apps = argocd_api.list_namespaced_custom_object(
            group="argoproj.io",
            version="v1alpha1",
            namespace=ARGOCD_NAMESPACE,
            plural="applications",
        )
    except ApiException:
        return set()

    used_ports = set()
    for app in apps.get("items", []):
        helm_values_str = (
            app.get("spec", {})
            .get("source", {})
            .get("helm", {})
            .get("values", "")
        )
        if helm_values_str:
            values = yaml.safe_load(helm_values_str)
            if values and "sftpPort" in values:
                used_ports.add(values["sftpPort"])

    return used_ports


def get_next_sftp_port(argocd_api: client.CustomObjectsApi) -> int:
    used_ports = get_used_sftp_ports(argocd_api)
    port = SFTP_PORT_START
    while port in used_ports:
        port += 1
    return port


# --- Instance count ---

def get_instance_count(argocd_api: client.CustomObjectsApi) -> int:
    try:
        apps = argocd_api.list_namespaced_custom_object(
            group="argoproj.io",
            version="v1alpha1",
            namespace=ARGOCD_NAMESPACE,
            plural="applications",
            label_selector="managed-by=wp-fleet",
        )
        return len(apps.get("items", []))
    except ApiException:
        return 0


# --- ArgoCD application helpers ---

def application_exists(argocd_api: client.CustomObjectsApi, name: str) -> bool:
    try:
        argocd_api.get_namespaced_custom_object(
            group="argoproj.io",
            version="v1alpha1",
            namespace=ARGOCD_NAMESPACE,
            plural="applications",
            name=name,
        )
        return True
    except ApiException as e:
        if e.status == 404:
            return False
        raise


def build_application_manifest(release_name: str, helm_values: dict) -> dict:
    return {
        "apiVersion": "argoproj.io/v1alpha1",
        "kind": "Application",
        "metadata": {
            "name": release_name,
            "namespace": ARGOCD_NAMESPACE,
            "labels": {
                "managed-by": "wp-fleet",
            },
        },
        "spec": {
            "project": "default",
            "source": {
                "repoURL": GITHUB_REPO,
                "path": CHART_PATH,
                "targetRevision": "HEAD",
                "helm": {
                    "releaseName": release_name,
                    "values": yaml.dump(helm_values, default_flow_style=False),
                },
            },
            "destination": {
                "server": "https://kubernetes.default.svc",
                "namespace": f"wordpress-{release_name}",
            },
            "syncPolicy": {
                "automated": {
                    "prune": True,
                    "selfHeal": True,
                },
                "syncOptions": [
                    "CreateNamespace=true",
                ],
            },
        },
    }


def create_argocd_application(argocd_api: client.CustomObjectsApi, manifest: dict):
    argocd_api.create_namespaced_custom_object(
        group="argoproj.io",
        version="v1alpha1",
        namespace=ARGOCD_NAMESPACE,
        plural="applications",
        body=manifest,
    )


def delete_argocd_application(argocd_api: client.CustomObjectsApi, name: str):
    argocd_api.delete_namespaced_custom_object(
        group="argoproj.io",
        version="v1alpha1",
        namespace=ARGOCD_NAMESPACE,
        plural="applications",
        name=name,
    )


def delete_namespace(name: str):
    core_api = client.CoreV1Api()
    try:
        core_api.delete_namespace(name)
    except ApiException as e:
        if e.status != 404:
            raise


# --- Request model ---

class DeployRequest(BaseModel):
    releaseName: str
    url: str
    title: str
    wpMail: str
    dbUser: str
    dbPassword: str
    dbRootPassword: str
    wpUser: str
    wpPassword: str
    sftpUser: str
    sftpPassword: str

    @field_validator("releaseName")
    @classmethod
    def validate_release_name(cls, v):
        if not re.match(r'^[a-z0-9][a-z0-9-]{0,52}[a-z0-9]$', v):
            raise ValueError("releaseName must be lowercase alphanumeric and hyphens only, 2-54 chars")
        return v


# --- Routes ---

@app.get("/api")
def read_root():
    return {"message": "Hello, World!"}


@app.post("/api/deploy")
def deploy(req: DeployRequest):
    argocd_api = get_argocd_client()

    if application_exists(argocd_api, req.releaseName):
        raise HTTPException(status_code=409, detail=f"Instance '{req.releaseName}' already exists.")

    with port_lock:
        if get_instance_count(argocd_api) >= MAX_INSTANCES:
            raise HTTPException(
                status_code=409,
                detail=f"Instance limit reached ({MAX_INSTANCES} max). Delete an existing instance before creating a new one.",
            )

        sftp_port = get_next_sftp_port(argocd_api)

        helm_values = {
            "url": req.url,
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
            raise HTTPException(status_code=500, detail=f"Failed to create ArgoCD application: {e.reason}")

    return {
        "message": "WordPress instance queued for deployment",
        "releaseName": req.releaseName,
        "namespace": f"wordpress-{req.releaseName}",
        "sftpPort": sftp_port,
    }


@app.delete("/api/deploy/{release_name}")
def undeploy(release_name: str):
    argocd_api = get_argocd_client()

    if not application_exists(argocd_api, release_name):
        raise HTTPException(status_code=404, detail=f"Instance '{release_name}' not found.")

    try:
        delete_argocd_application(argocd_api, release_name)
    except ApiException as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete ArgoCD application: {e.reason}")

    try:
        delete_namespace(f"wordpress-{release_name}")
    except ApiException as e:
        raise HTTPException(status_code=500, detail=f"ArgoCD app deleted, but failed to delete namespace: {e.reason}")

    return {"message": f"Instance '{release_name}' deleted."}


@app.get("/api/instances")
def list_instances():
    argocd_api = get_argocd_client()

    try:
        apps = argocd_api.list_namespaced_custom_object(
            group="argoproj.io",
            version="v1alpha1",
            namespace=ARGOCD_NAMESPACE,
            plural="applications",
            label_selector="managed-by=wp-fleet",
        )
    except ApiException as e:
        raise HTTPException(status_code=500, detail=f"Failed to list instances: {e.reason}")

    instances = []
    for app in apps.get("items", []):
        helm_values_str = (
            app.get("spec", {})
            .get("source", {})
            .get("helm", {})
            .get("values", "")
        )
        values = yaml.safe_load(helm_values_str) if helm_values_str else {}
        instances.append({
            "releaseName": app["metadata"]["name"],
            "namespace": app["spec"]["destination"]["namespace"],
            "syncStatus": app.get("status", {}).get("sync", {}).get("status"),
            "healthStatus": app.get("status", {}).get("health", {}).get("status"),
            "sftpPort": values.get("sftpPort"),
            "url": values.get("url"),
        })

    return {"instances": instances, "limit": MAX_INSTANCES}


app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)