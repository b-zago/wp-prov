import yaml
from kubernetes import client, config
from kubernetes.client.exceptions import ApiException

from config import (
    ARGOCD_NAMESPACE,
    CHART_PATH,
    FLEET_LABEL,
    GITHUB_REPO,
    SFTP_PORT_START,
    TARGET_NAMESPACE,
    WP_NAMESPACES,
)


def get_argocd_client() -> client.CustomObjectsApi:
    config.load_incluster_config()
    return client.CustomObjectsApi()


def get_networking_client() -> client.NetworkingV1Api:
    config.load_incluster_config()
    return client.NetworkingV1Api()


def _list_fleet_apps(argocd_api: client.CustomObjectsApi) -> list[dict]:
    apps = argocd_api.list_namespaced_custom_object(
        group="argoproj.io",
        version="v1alpha1",
        namespace=ARGOCD_NAMESPACE,
        plural="applications",
        label_selector=FLEET_LABEL,
    )
    return apps.get("items", [])


# --- Port assignment -------------------------------------------------------

def get_used_sftp_ports(argocd_api: client.CustomObjectsApi) -> set[int]:
    """SFTP ports in use by any fleet app across every WP namespace.

    NodePorts are cluster-wide, so we consider both prod and stage when
    allocating — a port taken in stage still collides with prod.
    """
    try:
        items = _list_fleet_apps(argocd_api)
    except ApiException:
        return set()

    used: set[int] = set()
    for app in items:
        dest_ns = app.get("spec", {}).get("destination", {}).get("namespace")
        if dest_ns not in WP_NAMESPACES:
            continue
        helm_values_str = (
            app.get("spec", {})
            .get("source", {})
            .get("helm", {})
            .get("values", "")
        )
        if not helm_values_str:
            continue
        values = yaml.safe_load(helm_values_str)
        if values and "sftpPort" in values:
            used.add(values["sftpPort"])

    return used


def get_next_sftp_port(argocd_api: client.CustomObjectsApi) -> int:
    used = get_used_sftp_ports(argocd_api)
    port = SFTP_PORT_START
    while port in used:
        port += 1
    return port


# --- Ingress host uniqueness ----------------------------------------------

def get_used_ingress_hosts(networking_api: client.NetworkingV1Api) -> set[str]:
    ingresses = networking_api.list_ingress_for_all_namespaces()
    hosts: set[str] = set()
    for ing in ingresses.items:
        rules = (ing.spec.rules or []) if ing.spec else []
        for rule in rules:
            if rule.host:
                hosts.add(rule.host)
    return hosts


# --- Instance count --------------------------------------------------------

def get_instance_count(argocd_api: client.CustomObjectsApi) -> int:
    try:
        return len(_list_fleet_apps(argocd_api))
    except ApiException:
        return 0


# --- ArgoCD application helpers --------------------------------------------

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
            # Ensures ArgoCD deletes all of this app's resources before the
            # Application object itself is removed, leaving the shared
            # namespace clean.
            "finalizers": ["resources-finalizer.argocd.argoproj.io"],
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
                "namespace": TARGET_NAMESPACE,
            },
            "syncPolicy": {
                "automated": {
                    "prune": True,
                    "selfHeal": True,
                },
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


def list_fleet_instances(argocd_api: client.CustomObjectsApi) -> list[dict]:
    items = _list_fleet_apps(argocd_api)
    out = []
    for app in items:
        helm_values_str = (
            app.get("spec", {})
            .get("source", {})
            .get("helm", {})
            .get("values", "")
        )
        values = yaml.safe_load(helm_values_str) if helm_values_str else {}
        out.append({
            "releaseName": app["metadata"]["name"],
            "namespace": app["spec"]["destination"]["namespace"],
            "syncStatus": app.get("status", {}).get("sync", {}).get("status"),
            "healthStatus": app.get("status", {}).get("health", {}).get("status"),
            "sftpPort": values.get("sftpPort"),
            "url": values.get("url"),
        })
    return out


def ensure_namespace(name: str):
    core_api = client.CoreV1Api()
    try:
        core_api.create_namespace(
            client.V1Namespace(metadata=client.V1ObjectMeta(name=name))
        )
    except ApiException as e:
        if e.status != 409:  # already exists
            raise
