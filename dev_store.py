"""In-memory fake store used when WP_PROV_DEV is set.

Lets the API serve realistic-looking data to the frontend without a live
ArgoCD/Kubernetes cluster.
"""

from threading import Lock

from config import MAX_INSTANCES, SFTP_PORT_START, TARGET_NAMESPACE


class DevStoreError(Exception):
    """Base class for dev-store errors that map to HTTP 4xx responses."""

    status_code = 400


class InstanceConflict(DevStoreError):
    status_code = 409


class InstanceLimitReached(DevStoreError):
    status_code = 409


class InstanceNotFound(DevStoreError):
    status_code = 404


_lock = Lock()
_instances: dict[str, dict] = {}
_next_sftp_port = SFTP_PORT_START


def _seed() -> None:
    global _next_sftp_port
    if _instances:
        return

    seeds = [
        {
            "releaseName": "acme-blog",
            "url": "https://acme-blog.example.com",
            "healthStatus": "Healthy",
            "syncStatus": "Synced",
        },
        {
            "releaseName": "beta-shop",
            "url": "https://shop.beta.dev",
            "healthStatus": "Progressing",
            "syncStatus": "OutOfSync",
        },
        {
            "releaseName": "legacy-site",
            "url": "https://legacy.example.org",
            "healthStatus": "Degraded",
            "syncStatus": "Unknown",
        },
    ]

    for s in seeds:
        name = s["releaseName"]
        _instances[name] = {
            "releaseName": name,
            "namespace": TARGET_NAMESPACE,
            "syncStatus": s["syncStatus"],
            "healthStatus": s["healthStatus"],
            "sftpPort": _next_sftp_port,
            "url": s["url"],
        }
        _next_sftp_port += 1


def seed_if_empty() -> None:
    with _lock:
        _seed()


def snapshot() -> list[dict]:
    with _lock:
        return list(_instances.values())


def create(release_name: str, url: str) -> int:
    global _next_sftp_port
    with _lock:
        if release_name in _instances:
            raise InstanceConflict(f"Instance '{release_name}' already exists.")
        if len(_instances) >= MAX_INSTANCES:
            raise InstanceLimitReached(
                f"Instance limit reached ({MAX_INSTANCES} max). "
                "Delete an existing instance before creating a new one."
            )
        port = _next_sftp_port
        _next_sftp_port += 1
        _instances[release_name] = {
            "releaseName": release_name,
            "namespace": TARGET_NAMESPACE,
            "syncStatus": "Synced",
            "healthStatus": "Progressing",
            "sftpPort": port,
            "url": url,
        }
        return port


def delete(release_name: str) -> None:
    with _lock:
        if release_name not in _instances:
            raise InstanceNotFound(f"Instance '{release_name}' not found.")
        del _instances[release_name]
