import os

ARGOCD_NAMESPACE = "argocd"
GITHUB_REPO = "https://github.com/b-zago/k3d-infra"
CHART_PATH = "charts/wp-chart"
SFTP_PORT_START = 30022

# Every instance gets a URL of the form https://<subdomain>.<SUBDOMAIN_DOMAIN>.
SUBDOMAIN_DOMAIN = "zagoapps.com"

MAX_INSTANCES = int(os.getenv("MAX_WORDPRESS_INSTANCES", "2"))

PROD_DEPLOY = os.getenv("PROD_DEPLOY", "1") != "0"
TARGET_NAMESPACE = "wp-instances-prod" if PROD_DEPLOY else "wp-instances-stage"

# All namespaces the fleet ever provisions into. SFTP ports are cluster-wide
# NodePorts, so a port in use by the stage env still conflicts with prod.
WP_NAMESPACES = ("wp-instances-prod", "wp-instances-stage")

FLEET_LABEL = "managed-by=wp-fleet"

# In dev mode, the API serves a local in-memory fake store instead of
# talking to a real ArgoCD/Kubernetes cluster. Useful for working on the
# frontend without a live cluster.
DEV_MODE = os.getenv("WP_PROV_DEV", "").lower() in {"1", "true", "yes", "on"}
